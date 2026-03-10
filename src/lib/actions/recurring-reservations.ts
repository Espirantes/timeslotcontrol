"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { VehicleType, RecurrenceType } from "@/generated/prisma/client";
import { isSlotFree, isGateOpen } from "@/lib/reservation-helpers";
import { checkHoliday } from "@/lib/holidays";
import { CreateRecurringSchema } from "@/lib/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurringItemTemplate = {
  transportUnitId: string;
  quantity: number;
  goodsWeightKg?: number | null;
  description?: string | null;
};

export type CreateRecurringReservationInput = {
  gateId: string;
  clientId: string;
  recurrenceType: RecurrenceType;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string;
  timeOfDay: string; // "HH:MM"
  durationMinutes: number;
  weekDays?: number[]; // [1,3,5]
  dayOfMonth?: number; // 1-31
  vehicleType: VehicleType;
  licensePlate?: string;
  driverName?: string;
  driverContact?: string;
  notes?: string;
  items: RecurringItemTemplate[];
  reservationType?: "LOADING" | "UNLOADING";
};

export type SkippedInstance = {
  date: string;
  reason: string;
};

export type GenerationResult = {
  created: number;
  skipped: SkippedInstance[];
};

export type RecurringReservationListItem = {
  id: string;
  gateName: string;
  clientName: string;
  supplierName: string;
  recurrenceType: RecurrenceType;
  recurrenceSummary: string;
  startDate: string;
  endDate: string | null;
  timeOfDay: string;
  durationMinutes: number;
  isActive: boolean;
  instanceCount: number;
  createdByName: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAdminOrWorker() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Admin or worker only");
  }
  return session.user;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getOccurrenceDates(
  recurrenceType: RecurrenceType,
  startDate: Date,
  endDate: Date,
  weekDays: number[] | null,
  dayOfMonth: number | null,
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dow = current.getDay(); // 0=Sun, 1=Mon … 6=Sat

    switch (recurrenceType) {
      case "DAILY":
        if (dow >= 1 && dow <= 5) dates.push(new Date(current));
        break;
      case "WEEKLY":
        if (weekDays && weekDays.includes(dow)) dates.push(new Date(current));
        break;
      case "MONTHLY":
        if (dayOfMonth && current.getDate() === dayOfMonth) dates.push(new Date(current));
        break;
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ─── Instance generation ──────────────────────────────────────────────────────

export async function generateInstances(
  recurringId: string,
  generateUpTo: Date,
): Promise<GenerationResult> {
  return prisma.$transaction(async (tx) => {
    // Lock the recurring reservation row to prevent concurrent generation
    await tx.$queryRaw`SELECT id FROM "recurring_reservation" WHERE id = ${recurringId} FOR UPDATE`;

    const recurring = await tx.recurringReservation.findUniqueOrThrow({
      where: { id: recurringId },
      include: { gate: { include: { warehouse: true } } },
    });

    if (!recurring.isActive) return { created: 0, skipped: [] };

    // Determine generation window
    const fromDate = recurring.lastGeneratedDate
      ? new Date(recurring.lastGeneratedDate.getTime() + 86400000) // day after last generated
      : new Date(recurring.startDate);

    const effectiveEnd = recurring.endDate && recurring.endDate < generateUpTo
      ? recurring.endDate
      : generateUpTo;

    if (fromDate > effectiveEnd) return { created: 0, skipped: [] };

    const weekDays = recurring.weekDays
      ? recurring.weekDays.split(",").map(Number)
      : null;

    const occurrences = getOccurrenceDates(
      recurring.recurrenceType,
      fromDate,
      effectiveEnd,
      weekDays,
      recurring.dayOfMonth,
    );

    const items = recurring.itemsTemplate as RecurringItemTemplate[];
    const country = recurring.gate.warehouse.country;

    let created = 0;
    const skipped: SkippedInstance[] = [];

    for (const date of occurrences) {
      const [h, m] = recurring.timeOfDay.split(":").map(Number);
      const startTime = new Date(date);
      startTime.setHours(h, m, 0, 0);
      const endTime = new Date(startTime.getTime() + recurring.durationMinutes * 60 * 1000);
      const dateStr = startTime.toISOString().slice(0, 10);

      // Skip past dates
      if (startTime < new Date()) continue;

      // Check holiday
      if (country) {
        const holiday = checkHoliday(country, startTime);
        if (holiday.isHoliday) {
          skipped.push({ date: dateStr, reason: `holiday:${holiday.name}` });
          continue;
        }
      }

      // Check gate open (uses main prisma client — read-only, safe outside tx)
      const gateOpen = await isGateOpen(recurring.gateId, startTime, endTime);
      if (!gateOpen) {
        skipped.push({ date: dateStr, reason: "gate_closed" });
        continue;
      }

      // Check gate blocks
      const block = await tx.gateBlock.findFirst({
        where: {
          gateId: recurring.gateId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (block) {
        skipped.push({ date: dateStr, reason: `blocked:${block.reason}` });
        continue;
      }

      // Check slot availability (uses main prisma client — read-only, safe outside tx)
      const slotFree = await isSlotFree(recurring.gateId, startTime, endTime);
      if (!slotFree) {
        skipped.push({ date: dateStr, reason: "occupied" });
        continue;
      }

      // Check no duplicate instance exists for this date
      const existing = await tx.reservation.findFirst({
        where: {
          recurringReservationId: recurring.id,
          status: { not: "CANCELLED" },
          confirmedVersion: {
            startTime: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
            },
          },
        },
      });
      if (existing) continue;

      // Create reservation instance (auto-confirmed)
      const reservation = await tx.reservation.create({
        data: {
          gateId: recurring.gateId,
          clientId: recurring.clientId,
          supplierId: recurring.supplierId,
          type: recurring.type,
          status: "CONFIRMED",
          recurringReservationId: recurring.id,
          createdById: recurring.createdById,
          versions: {
            create: {
              startTime,
              durationMinutes: recurring.durationMinutes,
              vehicleType: recurring.vehicleType,
              licensePlate: recurring.licensePlate,
              driverName: recurring.driverName,
              driverContact: recurring.driverContact,
              notes: recurring.notes,
              createdById: recurring.createdById,
              items: {
                create: items.map((item) => ({
                  transportUnitId: item.transportUnitId,
                  quantity: item.quantity,
                  goodsWeightKg: item.goodsWeightKg ?? null,
                  description: item.description ?? null,
                })),
              },
            },
          },
        },
        include: { versions: true },
      });

      // Set confirmedVersionId
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { confirmedVersionId: reservation.versions[0].id },
      });

      await tx.reservationStatusChange.create({
        data: {
          reservationId: reservation.id,
          status: "CONFIRMED",
          changedById: recurring.createdById,
        },
      });

      created++;
    }

    // Update watermark atomically with instance creation
    await tx.recurringReservation.update({
      where: { id: recurringId },
      data: { lastGeneratedDate: effectiveEnd },
    });

    return { created, skipped };
  }, { timeout: 30000 });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createRecurringReservation(rawInput: CreateRecurringReservationInput) {
  const input = CreateRecurringSchema.parse(rawInput);
  const user = await requireAdminOrWorker();

  // Resolve supplier — same pattern as createReservation
  const firstSupplier = await prisma.clientSupplier.findFirst({
    where: { clientId: input.clientId },
  });
  if (!firstSupplier) throw new Error("No supplier found for client");

  const weekDays = input.recurrenceType === "DAILY"
    ? "1,2,3,4,5"
    : input.recurrenceType === "WEEKLY"
      ? input.weekDays!.join(",")
      : null;

  const recurring = await prisma.recurringReservation.create({
    data: {
      gateId: input.gateId,
      clientId: input.clientId,
      supplierId: firstSupplier.supplierId,
      type: input.reservationType ?? "UNLOADING",
      recurrenceType: input.recurrenceType,
      startDate: new Date(input.startDate + "T00:00:00"),
      endDate: input.endDate ? new Date(input.endDate + "T23:59:59") : null,
      timeOfDay: input.timeOfDay,
      durationMinutes: input.durationMinutes,
      weekDays,
      dayOfMonth: input.recurrenceType === "MONTHLY" ? input.dayOfMonth : null,
      vehicleType: input.vehicleType,
      licensePlate: input.licensePlate || null,
      driverName: input.driverName || null,
      driverContact: input.driverContact || null,
      notes: input.notes || null,
      itemsTemplate: input.items,
      createdById: user.id,
    },
  });

  await auditLog({
    entityType: "recurringReservation",
    entityId: recurring.id,
    action: "created",
    newData: { recurrenceType: input.recurrenceType, startDate: input.startDate, timeOfDay: input.timeOfDay },
    userId: user.id,
  });

  // Generate instances for the next 30 days
  const generateUpTo = new Date();
  generateUpTo.setDate(generateUpTo.getDate() + 30);
  const result = await generateInstances(recurring.id, generateUpTo);

  revalidatePath("/", "layout");

  return { success: true, recurringId: recurring.id, ...result };
}

export async function deactivateRecurringReservation(id: string) {
  const user = await requireAdminOrWorker();

  await prisma.recurringReservation.update({
    where: { id },
    data: { isActive: false },
  });

  await auditLog({
    entityType: "recurringReservation",
    entityId: id,
    action: "deactivated",
    newData: { isActive: false },
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function cancelFutureInstances(recurringId: string) {
  const user = await requireAdminOrWorker();

  const cancelledCount = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const futureInstances = await tx.reservation.findMany({
      where: {
        recurringReservationId: recurringId,
        status: "CONFIRMED",
        confirmedVersion: { startTime: { gt: now } },
      },
    });

    for (const reservation of futureInstances) {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED" },
      });
      await tx.reservationStatusChange.create({
        data: {
          reservationId: reservation.id,
          status: "CANCELLED",
          changedById: user.id,
        },
      });
    }

    await tx.recurringReservation.update({
      where: { id: recurringId },
      data: { isActive: false },
    });

    return futureInstances.length;
  });

  await auditLog({
    entityType: "recurringReservation",
    entityId: recurringId,
    action: "bulk_updated",
    newData: { cancelledCount, isActive: false },
    userId: user.id,
  });

  revalidatePath("/", "layout");

  return { success: true, cancelledCount };
}

export async function getRecurringReservations(warehouseId?: string): Promise<RecurringReservationListItem[]> {
  await requireAdminOrWorker();

  const items = await prisma.recurringReservation.findMany({
    where: warehouseId ? { gate: { warehouseId } } : undefined,
    include: {
      gate: true,
      client: true,
      supplier: true,
      createdBy: { select: { name: true } },
      _count: { select: { instances: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((r) => ({
    id: r.id,
    gateName: r.gate.name,
    clientName: r.client.name,
    supplierName: r.supplier.name,
    recurrenceType: r.recurrenceType,
    recurrenceSummary: buildRecurrenceSummary(r.recurrenceType, r.weekDays, r.dayOfMonth, r.timeOfDay),
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
    timeOfDay: r.timeOfDay,
    durationMinutes: r.durationMinutes,
    isActive: r.isActive,
    instanceCount: r._count.instances,
    createdByName: r.createdBy.name,
  }));
}

export async function manuallyGenerateInstances(recurringId: string, daysAhead: number = 30) {
  await requireAdminOrWorker();

  const generateUpTo = new Date();
  generateUpTo.setDate(generateUpTo.getDate() + daysAhead);

  const result = await generateInstances(recurringId, generateUpTo);

  revalidatePath("/", "layout");

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRecurrenceSummary(
  type: RecurrenceType,
  weekDays: string | null,
  dayOfMonth: number | null,
  timeOfDay: string,
): string {
  const dayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
  switch (type) {
    case "DAILY":
      return `Po–Pá ${timeOfDay}`;
    case "WEEKLY": {
      const days = weekDays?.split(",").map(Number).map((d) => dayNames[d]).join(", ") ?? "";
      return `${days} ${timeOfDay}`;
    }
    case "MONTHLY":
      return `${dayOfMonth}. den ${timeOfDay}`;
    default:
      return timeOfDay;
  }
}
