"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { VehicleType } from "@/generated/prisma/client";
import {
  notifyReservationCreated,
  notifyReservationApproved,
  notifyReservationRejected,
  notifyStatusChanged,
} from "@/lib/email";
import { createNotificationsForEvent } from "@/lib/actions/notifications";
import { getLocale, getTranslations } from "next-intl/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult = {
  success: true;
  reservationId?: string;
  isCritical?: boolean;
};

export type ReservationItemInput = {
  transportUnitId: string;
  quantity: number;
  goodsWeightKg?: number | null;
  description?: string | null;
};

export type ReservationAdviceInput = {
  adviceNumber: string;
  quantity: number;
  note?: string | null;
};

export type CreateReservationInput = {
  gateId: string;
  clientId: string;
  startTime: string; // ISO string
  durationMinutes: number;
  vehicleType: VehicleType;
  licensePlate?: string;
  sealNumbers?: string;
  driverName?: string;
  driverContact?: string;
  notes?: string;
  items: ReservationItemInput[];
  advices?: ReservationAdviceInput[];
  reservationType?: "LOADING" | "UNLOADING";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get emails of users linked to a client/supplier who have email notifications enabled */
async function getEmailRecipients(clientId: string, supplierId: string): Promise<{ supplierEmail: string | null; clientEmail: string | null }> {
  const [supplierUser, clientUser] = await Promise.all([
    prisma.user.findFirst({
      where: { supplierId, isActive: true, notifyEmail: true },
      select: { email: true },
    }),
    prisma.user.findFirst({
      where: { clientId, isActive: true, notifyEmail: true },
      select: { email: true },
    }),
  ]);
  return {
    supplierEmail: supplierUser?.email ?? null,
    clientEmail: clientUser?.email ?? null,
  };
}

/** Verify the caller is authenticated and return the session user (M5). */
async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** Verify that the gate belongs to one of the worker's assigned warehouses (C3). */
async function requireWarehouseAccess(gateId: string, warehouseIds: string[]) {
  const gate = await prisma.gates.findUnique({
    where: { id: gateId },
    select: { warehouseId: true },
  });
  if (!gate) throw new Error("Gate not found");
  if (!warehouseIds.includes(gate.warehouseId)) {
    throw new Error("Gate is not in your assigned warehouse");
  }
}

/** Get public holidays for a gate's warehouse country for a given month (0-based). */
export async function getGateHolidays(
  gateId: string,
  year: number,
  month: number,
): Promise<Array<{ date: string; name: string }>> {
  const gate = await prisma.gates.findUnique({
    where: { id: gateId },
    select: { warehouse: { select: { country: true } } },
  });
  if (!gate?.warehouse.country) return [];
  const { getHolidaysForMonth } = await import("@/lib/holidays");
  return getHolidaysForMonth(gate.warehouse.country, year, month);
}

/** Check if a gate block overlaps with the given time range. Returns reason if blocked, null if free. */
async function getBlockingReason(gateId: string, startTime: Date, endTime: Date): Promise<string | null> {
  const block = await prisma.gateBlock.findFirst({
    where: {
      gateId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  return block?.reason ?? null;
}

/** Get gate blocks for a specific date (for form time select). */
export async function getGateBlocksForDate(
  gateId: string,
  date: string,
): Promise<Array<{ startTime: string; endTime: string; reason: string }>> {
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");
  const blocks = await prisma.gateBlock.findMany({
    where: {
      gateId,
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    orderBy: { startTime: "asc" },
  });
  return blocks.map((b) => ({
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    reason: b.reason,
  }));
}

/** Check if a gate slot is free (no confirmed reservation overlapping).
 *  Uses findMany with proper two-sided overlap condition to avoid
 *  the findFirst single-row bug (C1). */
export async function isSlotFree(
  gateId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string,
) {
  // Fetch ALL versions that start before the requested end time
  const candidates = await prisma.reservationVersion.findMany({
    where: {
      confirmedByReservation: {
        gateId,
        status: { in: ["CONFIRMED", "UNLOADING_STARTED"] },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      startTime: { lt: endTime },
    },
    select: { startTime: true, durationMinutes: true },
  });

  // Check the second half of the overlap condition in JS
  return !candidates.some((c) => {
    const conflEnd = new Date(c.startTime.getTime() + c.durationMinutes * 60 * 1000);
    return conflEnd > startTime;
  });
}

/** Check if gate is open at the given time */
export async function isGateOpen(gateId: string, startTime: Date, endTime: Date) {
  const dayOfWeek = startTime.getDay();
  const hours = await prisma.gateOpeningHours.findUnique({
    where: { gateId_dayOfWeek: { gateId, dayOfWeek } },
  });

  if (!hours || !hours.isOpen) return false;

  const [openH, openM] = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  const gateOpen = new Date(startTime);
  gateOpen.setHours(openH, openM, 0, 0);
  const gateClose = new Date(startTime);
  gateClose.setHours(closeH, closeM, 0, 0);

  return startTime >= gateOpen && endTime <= gateClose;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createReservation(input: CreateReservationInput) {
  const user = await requireSession();
  const { role, supplierId } = user;

  // Block unverified users
  if (!user.isVerified) throw new Error("Account not verified");

  // C3: Warehouse scope check for workers
  if (role === "WAREHOUSE_WORKER") {
    await requireWarehouseAccess(input.gateId, user.warehouseIds);
  }

  // Determine supplierId
  let resolvedSupplierId: string;
  if (role === "SUPPLIER") {
    if (!supplierId) throw new Error("User has no supplier linked");
    resolvedSupplierId = supplierId;
    // Verify supplier is linked to the requested client
    const link = await prisma.clientSupplier.findUnique({
      where: {
        clientId_supplierId: { clientId: input.clientId, supplierId },
      },
    });
    if (!link) throw new Error("Supplier not linked to this client");
  } else if (role === "ADMIN" || role === "WAREHOUSE_WORKER") {
    // Admin/worker can create on behalf — supplierId must be provided via a different field
    // For now require a supplierUserId passed separately; simplest: first supplier of client
    const firstSupplier = await prisma.clientSupplier.findFirst({
      where: { clientId: input.clientId },
    });
    if (!firstSupplier) throw new Error("No supplier found for client");
    resolvedSupplierId = firstSupplier.supplierId;
  } else {
    throw new Error("Clients cannot create reservations directly");
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60 * 1000);

  // Validations
  if (input.durationMinutes % 15 !== 0) throw new Error("Duration must be a multiple of 15 min");
  if (role !== "ADMIN" && startTime < new Date()) throw new Error("Cannot create reservation in the past");
  if (role !== "ADMIN" && !await isGateOpen(input.gateId, startTime, endTime)) throw new Error("Gate is closed at requested time");
  if (role !== "ADMIN") {
    const gateWithWarehouse = await prisma.gates.findUniqueOrThrow({
      where: { id: input.gateId },
      select: { warehouse: { select: { country: true } } },
    });
    if (gateWithWarehouse.warehouse.country) {
      const { checkHoliday } = await import("@/lib/holidays");
      const holiday = checkHoliday(gateWithWarehouse.warehouse.country, startTime);
      if (holiday.isHoliday) throw new Error(`Holiday: ${holiday.name}`);
    }
    const blockReason = await getBlockingReason(input.gateId, startTime, endTime);
    if (blockReason) throw new Error(`Blocked: ${blockReason}`);
  }
  const isAdminCreate = role === "ADMIN";

  // Wrap availability check + creation in transaction to prevent TOCTOU race (C2)
  const reservation = await prisma.$transaction(async (tx) => {
    // Re-check slot availability inside transaction
    const candidates = await tx.reservationVersion.findMany({
      where: {
        confirmedByReservation: {
          gateId: input.gateId,
          status: { in: ["CONFIRMED", "UNLOADING_STARTED"] },
        },
        startTime: { lt: endTime },
      },
      select: { startTime: true, durationMinutes: true },
    });
    const hasConflict = candidates.some((c) => {
      const conflEnd = new Date(c.startTime.getTime() + c.durationMinutes * 60 * 1000);
      return conflEnd > startTime;
    });
    if (hasConflict) throw new Error("Slot is already taken");

    const res = await tx.reservation.create({
      data: {
        gateId: input.gateId,
        clientId: input.clientId,
        supplierId: resolvedSupplierId,
        type: input.reservationType ?? "UNLOADING",
        status: isAdminCreate ? "CONFIRMED" : "REQUESTED",
        createdById: user.id,
        versions: {
          create: {
            startTime,
            durationMinutes: input.durationMinutes,
            vehicleType: input.vehicleType,
            licensePlate: input.licensePlate || null,
            sealNumbers: input.sealNumbers || null,
            driverName: input.driverName || null,
            driverContact: input.driverContact || null,
            notes: input.notes || null,
            createdById: user.id,
            items: {
              create: input.items.map((item) => ({
                transportUnitId: item.transportUnitId,
                quantity: item.quantity,
                goodsWeightKg: item.goodsWeightKg ?? null,
                description: item.description ?? null,
              })),
            },
            advices: {
              create: (input.advices ?? []).map((a) => ({
                adviceNumber: a.adviceNumber,
                quantity: a.quantity,
                note: a.note ?? null,
              })),
            },
          },
        },
      },
      include: { versions: true },
    });

    // Set version pointer — admin confirms immediately, others go to pending
    const versionId = res.versions[0].id;
    await tx.reservation.update({
      where: { id: res.id },
      data: isAdminCreate
        ? { confirmedVersionId: versionId }
        : { pendingVersionId: versionId },
    });

    await tx.reservationStatusChange.create({
      data: {
        reservationId: res.id,
        status: isAdminCreate ? "CONFIRMED" : "REQUESTED",
        changedById: user.id,
      },
    });

    return res;
  });

  revalidatePath("/calendar");
  revalidatePath("/reservations");

  // H12: Move audit, email, and notification side effects after response
  const resId = reservation.id;
  const gateId = input.gateId;
  const inputStartTime = input.startTime;
  const cId = input.clientId;
  const sId = resolvedSupplierId;
  const userId = user.id;
  const status = isAdminCreate ? "CONFIRMED" : "REQUESTED";

  after(async () => {
    await auditLog({
      entityType: "reservation",
      entityId: resId,
      action: "created",
      newData: { status, startTime: inputStartTime, durationMinutes: input.durationMinutes },
      userId,
    });

    const [gate, supplier, workers, locale] = await Promise.all([
      prisma.gates.findUnique({ where: { id: gateId }, include: { warehouse: true } }),
      prisma.supplier.findUnique({ where: { id: sId } }),
      prisma.user.findMany({
        where: {
          isActive: true,
          notifyEmail: true,
          OR: [
            { role: "ADMIN" },
            { role: "WAREHOUSE_WORKER", warehouses: { some: { warehouseId: gateId } } },
          ],
        },
        select: { email: true },
      }),
      getLocale(),
    ]);

    notifyReservationCreated({
      reservationId: resId,
      gateName: gate?.name ?? "",
      supplierName: supplier?.name ?? "",
      startTime: inputStartTime,
      workerEmails: workers.map((w) => w.email),
      locale,
    }).catch(console.error);

    createNotificationsForEvent({
      type: "RESERVATION_CREATED",
      reservationId: resId,
      title: gate?.name ?? "",
      message: `${supplier?.name ?? ""} — ${new Date(inputStartTime).toLocaleString(locale, { timeZone: "Europe/Prague" })}`,
      warehouseId: gate?.warehouseId ?? "",
      clientId: cId,
      supplierId: sId,
    }).catch(console.error);
  });

  return { success: true, reservationId: resId };
}

export async function approveReservation(reservationId: string) {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can approve reservations");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { pendingVersion: true, confirmedVersion: true },
  });

  // C3: Warehouse scope check for workers
  if (user.role === "WAREHOUSE_WORKER") {
    await requireWarehouseAccess(reservation.gateId, user.warehouseIds);
  }

  if (!reservation.pendingVersionId || !reservation.pendingVersion) throw new Error("No pending version to approve");

  const pendingVersion = reservation.pendingVersion;
  const endTime = new Date(pendingVersion.startTime.getTime() + pendingVersion.durationMinutes * 60 * 1000);
  const oldStatus = reservation.status;

  // Wrap slot check + approval in transaction to prevent TOCTOU race (C2)
  await prisma.$transaction(async (tx) => {
    const candidates = await tx.reservationVersion.findMany({
      where: {
        confirmedByReservation: {
          gateId: reservation.gateId,
          status: { in: ["CONFIRMED", "UNLOADING_STARTED"] },
          id: { not: reservationId },
        },
        startTime: { lt: endTime },
      },
      select: { startTime: true, durationMinutes: true },
    });
    const hasConflict = candidates.some((c) => {
      const conflEnd = new Date(c.startTime.getTime() + c.durationMinutes * 60 * 1000);
      return conflEnd > pendingVersion.startTime;
    });
    if (hasConflict) throw new Error("Slot is no longer available");

    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: "CONFIRMED",
        confirmedVersionId: reservation.pendingVersionId,
        pendingVersionId: null,
      },
    });

    await tx.reservationStatusChange.create({
      data: {
        reservationId,
        status: "CONFIRMED",
        changedById: user.id,
      },
    });
  });

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // H12: Side effects after response
  const approveUserId = user.id;
  const pendingVerId = reservation.pendingVersionId;
  after(async () => {
    await auditLog({
      entityType: "reservation",
      entityId: reservationId,
      action: "version_approved",
      oldData: { status: oldStatus },
      newData: { status: "CONFIRMED", confirmedVersionId: pendingVerId },
      userId: approveUserId,
    });

    const full = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { gate: true, supplier: true, client: true, confirmedVersion: true },
    });
    if (full?.confirmedVersion) {
      const [locale, emailRecipients] = await Promise.all([
        getLocale(),
        getEmailRecipients(full.clientId, full.supplierId),
      ]);
      notifyReservationApproved({
        reservationId,
        gateName: full.gate.name,
        startTime: full.confirmedVersion.startTime.toISOString(),
        supplierEmail: emailRecipients.supplierEmail,
        clientEmail: emailRecipients.clientEmail,
        locale,
      }).catch(console.error);

      createNotificationsForEvent({
        type: "RESERVATION_APPROVED",
        reservationId,
        title: full.gate.name,
        message: new Date(full.confirmedVersion.startTime).toLocaleString(locale, { timeZone: "Europe/Prague" }),
        warehouseId: full.gate.warehouseId,
        clientId: full.clientId,
        supplierId: full.supplierId,
      }).catch(console.error);
    }
  });

  return { success: true };
}

export async function rejectReservation(reservationId: string) {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can reject reservations");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  // C3: Warehouse scope check for workers
  if (user.role === "WAREHOUSE_WORKER") {
    await requireWarehouseAccess(reservation.gateId, user.warehouseIds);
  }

  const wasNew = reservation.status === "REQUESTED" && !reservation.confirmedVersionId;

  // H4: Wrap mutation + status change atomically
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: wasNew ? "CANCELLED" : reservation.status,
        pendingVersionId: null,
      },
    });

    if (wasNew) {
      await tx.reservationStatusChange.create({
        data: {
          reservationId,
          status: "CANCELLED",
          changedById: user.id,
        },
      });
    }
  });

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // H12: Side effects after response
  const rejectUserId = user.id;
  const rejectOldStatus = reservation.status;
  after(async () => {
    await auditLog({
      entityType: "reservation",
      entityId: reservationId,
      action: "version_rejected",
      oldData: { status: rejectOldStatus },
      newData: { pendingVersionId: null },
      userId: rejectUserId,
    });

    const full = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { gate: true, supplier: true, client: true },
    });
    if (full) {
      const [locale, emailRecipients] = await Promise.all([
        getLocale(),
        getEmailRecipients(full.clientId, full.supplierId),
      ]);
      notifyReservationRejected({
        reservationId,
        gateName: full.gate.name,
        supplierEmail: emailRecipients.supplierEmail,
        clientEmail: emailRecipients.clientEmail,
        locale,
      }).catch(console.error);

      createNotificationsForEvent({
        type: "RESERVATION_REJECTED",
        reservationId,
        title: full.gate.name,
        message: "",
        warehouseId: full.gate.warehouseId,
        clientId: full.clientId,
        supplierId: full.supplierId,
      }).catch(console.error);
    }
  });

  return { success: true };
}

export async function updateReservationStatus(
  reservationId: string,
  newStatus: "UNLOADING_STARTED" | "UNLOADING_COMPLETED" | "CLOSED" | "CANCELLED"
) {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can change reservation status");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  // C3: Warehouse scope check for workers
  if (user.role === "WAREHOUSE_WORKER") {
    await requireWarehouseAccess(reservation.gateId, user.warehouseIds);
  }

  const allowed: Record<string, string[]> = {
    CONFIRMED: ["UNLOADING_STARTED", "CANCELLED"],
    UNLOADING_STARTED: ["UNLOADING_COMPLETED"],
    UNLOADING_COMPLETED: ["CLOSED"],
  };

  if (!allowed[reservation.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${reservation.status} to ${newStatus}`);
  }

  // H4: Wrap mutation + status change atomically
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: newStatus },
    });

    await tx.reservationStatusChange.create({
      data: {
        reservationId,
        status: newStatus,
        changedById: user.id,
      },
    });
  });

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // H12: Side effects after response
  const statusUserId = user.id;
  const statusOld = reservation.status;
  after(async () => {
    await auditLog({
      entityType: "reservation",
      entityId: reservationId,
      action: "status_changed",
      oldData: { status: statusOld },
      newData: { status: newStatus },
      userId: statusUserId,
    });

    const full = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { gate: true, supplier: true, client: true },
    });
    if (full) {
      const [locale, tStatus, emailRecipients] = await Promise.all([
        getLocale(),
        getTranslations("reservation.status"),
        getEmailRecipients(full.clientId, full.supplierId),
      ]);
      notifyStatusChanged({
        reservationId,
        gateName: full.gate.name,
        newStatus,
        supplierEmail: emailRecipients.supplierEmail,
        clientEmail: emailRecipients.clientEmail,
        locale,
      }).catch(console.error);

      createNotificationsForEvent({
        type: "STATUS_CHANGED",
        reservationId,
        title: full.gate.name,
        message: tStatus(newStatus),
        warehouseId: full.gate.warehouseId,
        clientId: full.clientId,
        supplierId: full.supplierId,
      }).catch(console.error);
    }
  });

  return { success: true };
}

// ─── List / detail queries ────────────────────────────────────────────────────

export type ReservationListItem = {
  id: string;
  status: string;
  reservationType: string;
  gateName: string;
  warehouseId: string;
  clientName: string;
  supplierName: string;
  startTime: string; // ISO
  durationMinutes: number;
  vehicleType: string;
  licensePlate: string | null;
  hasPendingVersion: boolean;
  // pending version info (for workers to review)
  pendingStartTime: string | null;
  pendingDurationMinutes: number | null;
  pendingVehicleType: string | null;
  pendingLicensePlate: string | null;
  notes: string | null;
};

export async function getReservationList(): Promise<ReservationListItem[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, warehouseIds, clientId, supplierId } = session.user;

  // C4: Fail closed — scoped roles with missing scope values must not fall through
  if (role === "WAREHOUSE_WORKER" && warehouseIds.length === 0) throw new Error("INVALID_SESSION");
  if (role === "CLIENT" && !clientId) throw new Error("INVALID_SESSION");
  if (role === "SUPPLIER" && !supplierId) throw new Error("INVALID_SESSION");

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(role === "WAREHOUSE_WORKER"
        ? { gate: { warehouseId: { in: warehouseIds } } }
        : {}),
      ...(role === "ADMIN" ? {} : {}),
      ...(role === "CLIENT" ? { clientId: clientId! } : {}),
      ...(role === "SUPPLIER" ? { supplierId: supplierId! } : {}),
    },
    include: {
      gate: { include: { warehouse: true } },
      client: true,
      supplier: true,
      confirmedVersion: true,
      pendingVersion: true,
    },
    orderBy: [
      // Pending first, then by start time
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  return reservations.map((r) => {
    // Display version = confirmed if exists, else pending
    const displayVersion = r.confirmedVersion ?? r.pendingVersion;
    return {
      id: r.id,
      status: r.status,
      reservationType: r.type,
      gateName: r.gate.name,
      warehouseId: r.gate.warehouseId,
      clientName: r.client.name,
      supplierName: r.supplier.name,
      startTime: displayVersion?.startTime.toISOString() ?? "",
      durationMinutes: displayVersion?.durationMinutes ?? 0,
      vehicleType: displayVersion?.vehicleType ?? "",
      licensePlate: displayVersion?.licensePlate ?? null,
      hasPendingVersion: !!r.pendingVersionId,
      pendingStartTime: r.pendingVersion?.startTime.toISOString() ?? null,
      pendingDurationMinutes: r.pendingVersion?.durationMinutes ?? null,
      pendingVehicleType: r.pendingVersion?.vehicleType ?? null,
      pendingLicensePlate: r.pendingVersion?.licensePlate ?? null,
      notes: displayVersion?.notes ?? null,
    };
  });
}

// ─── Detail query ────────────────────────────────────────────────────────────

export type ReservationVersionDetail = {
  id: string;
  startTime: string;
  durationMinutes: number;
  vehicleType: string;
  licensePlate: string | null;
  sealNumbers: string | null;
  driverName: string | null;
  driverContact: string | null;
  notes: string | null;
  createdAt: string;
  createdByName: string;
  items: {
    id: string;
    transportUnitId: string;
    transportUnitName: string;
    transportUnitWeightKg: number;
    quantity: number;
    goodsWeightKg: number | null;
    description: string | null;
  }[];
  advices: {
    id: string;
    adviceNumber: string;
    quantity: number;
    note: string | null;
  }[];
};

export type StatusChangeItem = {
  id: string;
  status: string;
  changedAt: string;
  changedByName: string;
};

export type ReservationDetail = {
  id: string;
  status: string;
  reservationType: string;
  gateId: string;
  gateName: string;
  warehouseName: string;
  warehouseId: string;
  clientId: string;
  supplierId: string;
  clientName: string;
  supplierName: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  confirmedVersion: ReservationVersionDetail | null;
  pendingVersion: ReservationVersionDetail | null;
  statusChanges: StatusChangeItem[];
  attachments: {
    id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    uploadedByName: string;
    uploadedAt: string;
  }[];
};

function mapVersion(
  v: Awaited<ReturnType<typeof prisma.reservationVersion.findUnique>> & {
    createdBy: { name: string };
    items: { id: string; transportUnitId: string; transportUnit: { name: string; weightKg: unknown }; quantity: number; goodsWeightKg: unknown; description: string | null }[];
    advices: { id: string; adviceNumber: string; quantity: number; note: string | null }[];
  }
): ReservationVersionDetail {
  return {
    id: v.id,
    startTime: v.startTime.toISOString(),
    durationMinutes: v.durationMinutes,
    vehicleType: v.vehicleType,
    licensePlate: v.licensePlate,
    sealNumbers: v.sealNumbers,
    driverName: v.driverName,
    driverContact: v.driverContact,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    createdByName: v.createdBy.name,
    items: v.items.map((i) => ({
      id: i.id,
      transportUnitId: i.transportUnitId,
      transportUnitName: i.transportUnit.name,
      transportUnitWeightKg: Number(i.transportUnit.weightKg),
      quantity: i.quantity,
      goodsWeightKg: i.goodsWeightKg !== null ? Number(i.goodsWeightKg) : null,
      description: i.description,
    })),
    advices: v.advices.map((a) => ({
      id: a.id,
      adviceNumber: a.adviceNumber,
      quantity: a.quantity,
      note: a.note,
    })),
  };
}

export async function getReservationDetail(reservationId: string): Promise<ReservationDetail | null> {
  const session = await auth();
  if (!session) return null;

  const { role, warehouseIds, clientId, supplierId } = session.user;

  // C4: Fail closed — scoped roles with missing scope values must not fall through
  if (role === "WAREHOUSE_WORKER" && warehouseIds.length === 0) throw new Error("INVALID_SESSION");
  if (role === "CLIENT" && !clientId) throw new Error("INVALID_SESSION");
  if (role === "SUPPLIER" && !supplierId) throw new Error("INVALID_SESSION");

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      gate: { include: { warehouse: true } },
      client: true,
      supplier: true,
      createdBy: true,
      confirmedVersion: { include: { createdBy: true, items: { include: { transportUnit: true } }, advices: true } },
      pendingVersion: { include: { createdBy: true, items: { include: { transportUnit: true } }, advices: true } },
      statusChanges: { include: { changedBy: { select: { name: true } } }, orderBy: { changedAt: "asc" } },
      attachments: { include: { uploadedBy: { select: { name: true } } }, orderBy: { uploadedAt: "asc" } },
    },
  });

  if (!r) return null;

  // Visibility check
  if (role === "WAREHOUSE_WORKER" && !warehouseIds.includes(r.gate.warehouseId)) return null;
  if (role === "CLIENT" && r.clientId !== clientId) return null;
  if (role === "SUPPLIER" && r.supplierId !== supplierId) return null;

  return {
    id: r.id,
    status: r.status,
    reservationType: r.type,
    gateId: r.gateId,
    gateName: r.gate.name,
    warehouseName: r.gate.warehouse.name,
    warehouseId: r.gate.warehouseId,
    clientId: r.clientId,
    supplierId: r.supplierId,
    clientName: r.client.name,
    supplierName: r.supplier.name,
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    confirmedVersion: r.confirmedVersion ? mapVersion(r.confirmedVersion as Parameters<typeof mapVersion>[0]) : null,
    pendingVersion: r.pendingVersion ? mapVersion(r.pendingVersion as Parameters<typeof mapVersion>[0]) : null,
    statusChanges: r.statusChanges.map((sc) => ({
      id: sc.id,
      status: sc.status,
      changedAt: sc.changedAt.toISOString(),
      changedByName: sc.changedBy.name,
    })),
    attachments: r.attachments.map((a) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      uploadedByName: a.uploadedBy.name,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  };
}

// ─── Form data helpers ────────────────────────────────────────────────────────

export async function getFormData(warehouseId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, supplierId, clientId } = session.user;

  // M13: Parallelize independent queries
  const clientsPromise = (async () => {
    if (role === "SUPPLIER" && supplierId) {
      const links = await prisma.clientSupplier.findMany({
        where: { supplierId },
        include: { client: true },
      });
      return links.map((l) => ({ id: l.client.id, name: l.client.name }));
    } else if (role === "CLIENT" && clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      return client ? [{ id: client.id, name: client.name }] : [];
    } else if (role === "ADMIN" || role === "WAREHOUSE_WORKER") {
      return prisma.client.findMany({ orderBy: { name: "asc" } });
    }
    return [] as { id: string; name: string }[];
  })();

  const [gates, clients, transportUnits] = await Promise.all([
    prisma.gates.findMany({
      where: { warehouseId, isActive: true },
      include: { openingHours: true },
      orderBy: { name: "asc" },
    }),
    clientsPromise,
    prisma.transportUnit.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, weightKg: true, processingMinutes: true },
    }),
  ]);

  return {
    gates: gates.map((g) => ({
      id: g.id,
      name: g.name,
      openingHours: g.openingHours,
    })),
    clients,
    userRole: role,
    transportUnits: transportUnits.map((tu) => ({
      id: tu.id,
      name: tu.name,
      weightKg: Number(tu.weightKg),
      processingMinutes: tu.processingMinutes,
    })),
  };
}

// ─── Edit reservation ────────────────────────────────────────────────────────

export type EditReservationInput = {
  reservationId: string;
  startTime?: string;
  durationMinutes?: number;
  vehicleType?: VehicleType;
  licensePlate?: string | null;
  sealNumbers?: string | null;
  driverName?: string | null;
  driverContact?: string | null;
  notes?: string | null;
  items?: ReservationItemInput[];
  advices?: ReservationAdviceInput[];
  reservationType?: "LOADING" | "UNLOADING";
};

/** Detect whether changes affect unloading time (and thus require approval) */
function hasCriticalChanges(
  input: EditReservationInput,
  current: {
    startTime: Date;
    durationMinutes: number;
    items: { transportUnitId: string; quantity: number }[];
  },
): boolean {
  if (input.startTime !== undefined) {
    if (new Date(input.startTime).getTime() !== current.startTime.getTime()) return true;
  }
  if (input.durationMinutes !== undefined && input.durationMinutes !== current.durationMinutes) {
    return true;
  }
  if (input.items !== undefined) {
    if (input.items.length !== current.items.length) return true;
    const sortedCurrent = [...current.items].sort((a, b) =>
      a.transportUnitId.localeCompare(b.transportUnitId) || a.quantity - b.quantity,
    );
    const sortedNew = [...input.items].sort((a, b) =>
      a.transportUnitId.localeCompare(b.transportUnitId) || a.quantity - b.quantity,
    );
    for (let i = 0; i < sortedCurrent.length; i++) {
      if (sortedCurrent[i].transportUnitId !== sortedNew[i].transportUnitId) return true;
      if (sortedCurrent[i].quantity !== sortedNew[i].quantity) return true;
    }
  }
  return false;
}

export async function editReservation(input: EditReservationInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const user = session.user;
  const { role, clientId, supplierId } = user;

  // M2: enforce 15-minute duration grid (same as create)
  if (input.durationMinutes !== undefined && input.durationMinutes % 15 !== 0) {
    throw new Error("Duration must be a multiple of 15 minutes");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: input.reservationId },
    include: {
      gate: true,
      confirmedVersion: { include: { items: true, advices: true } },
      pendingVersion: { include: { items: true, advices: true } },
    },
  });

  // Auth: CLIENT sees only their client's reservations, SUPPLIER only their own
  if (role === "CLIENT" && reservation.clientId !== clientId) {
    throw new Error("Unauthorized");
  }
  if (role === "SUPPLIER" && reservation.supplierId !== supplierId) {
    throw new Error("Unauthorized");
  }

  // Status guard: REQUESTED or CONFIRMED only
  if (!["REQUESTED", "CONFIRMED"].includes(reservation.status)) {
    throw new Error("Reservation cannot be edited in current status");
  }

  // Holiday check when changing time (non-admin only)
  if (input.startTime !== undefined && role !== "ADMIN") {
    const gateWithWarehouse = await prisma.gates.findUniqueOrThrow({
      where: { id: reservation.gateId },
      select: { warehouse: { select: { country: true } } },
    });
    if (gateWithWarehouse.warehouse.country) {
      const { checkHoliday } = await import("@/lib/holidays");
      const holiday = checkHoliday(gateWithWarehouse.warehouse.country, new Date(input.startTime));
      if (holiday.isHoliday) throw new Error(`Holiday: ${holiday.name}`);
    }
    const newStart = new Date(input.startTime);
    const newDuration = input.durationMinutes ?? reservation.confirmedVersion?.durationMinutes ?? reservation.pendingVersion?.durationMinutes ?? 60;
    const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);
    const blockReason = await getBlockingReason(reservation.gateId, newStart, newEnd);
    if (blockReason) throw new Error(`Blocked: ${blockReason}`);
  }

  // Update reservation type if provided (lives on Reservation, not version)
  if (input.reservationType !== undefined) {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { type: input.reservationType },
    });
  }

  // REQUESTED: edit the pending version directly (not yet approved, all changes are direct)
  if (reservation.status === "REQUESTED") {
    const pending = reservation.pendingVersion;
    if (!pending) throw new Error("No version to edit");

    await prisma.reservationVersion.update({
      where: { id: pending.id },
      data: {
        ...(input.startTime !== undefined ? { startTime: new Date(input.startTime) } : {}),
        ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
        ...(input.licensePlate !== undefined ? { licensePlate: input.licensePlate } : {}),
        ...(input.sealNumbers !== undefined ? { sealNumbers: input.sealNumbers } : {}),
        ...(input.driverName !== undefined ? { driverName: input.driverName } : {}),
        ...(input.driverContact !== undefined ? { driverContact: input.driverContact } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    if (input.items !== undefined) {
      await prisma.reservationItem.deleteMany({ where: { reservationVersionId: pending.id } });
      await prisma.reservationItem.createMany({
        data: input.items.map((item) => ({
          reservationVersionId: pending.id,
          transportUnitId: item.transportUnitId,
          quantity: item.quantity,
          goodsWeightKg: item.goodsWeightKg ?? null,
          description: item.description ?? null,
        })),
      });
    }

    if (input.advices !== undefined) {
      await prisma.reservationAdvice.deleteMany({ where: { reservationVersionId: pending.id } });
      if (input.advices.length > 0) {
        await prisma.reservationAdvice.createMany({
          data: input.advices.map((a) => ({
            reservationVersionId: pending.id,
            adviceNumber: a.adviceNumber,
            quantity: a.quantity,
            note: a.note ?? null,
          })),
        });
      }
    }

    await auditLog({
      entityType: "reservation",
      entityId: reservation.id,
      action: "updated",
      newData: { directEdit: true, status: "REQUESTED" },
      userId: user.id,
    });

    revalidatePath("/calendar");
    revalidatePath(`/reservations/${reservation.id}`);
    revalidatePath("/reservations");

    return { success: true, isCritical: false };
  }

  // CONFIRMED: critical/non-critical logic
  if (!reservation.confirmedVersion) {
    throw new Error("No confirmed version to edit");
  }
  if (reservation.pendingVersionId) {
    throw new Error("Reservation already has a pending change");
  }

  const base = reservation.confirmedVersion;

  const isCritical = hasCriticalChanges(input, {
    startTime: base.startTime,
    durationMinutes: base.durationMinutes,
    items: base.items.map((i) => ({ transportUnitId: i.transportUnitId, quantity: i.quantity })),
  });

  const isAdmin = role === "ADMIN";

  if (!isCritical || isAdmin) {
    // Direct update — non-critical changes or admin overrides
    if (isCritical && isAdmin) {
      const newStart = input.startTime ? new Date(input.startTime) : base.startTime;
      const newDuration = input.durationMinutes ?? base.durationMinutes;
      const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);
      if (!await isSlotFree(reservation.gateId, newStart, newEnd, reservation.id)) {
        throw new Error("Slot is already taken");
      }
    }

    await prisma.reservationVersion.update({
      where: { id: base.id },
      data: {
        ...(input.startTime !== undefined ? { startTime: new Date(input.startTime) } : {}),
        ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
        ...(input.licensePlate !== undefined ? { licensePlate: input.licensePlate } : {}),
        ...(input.sealNumbers !== undefined ? { sealNumbers: input.sealNumbers } : {}),
        ...(input.driverName !== undefined ? { driverName: input.driverName } : {}),
        ...(input.driverContact !== undefined ? { driverContact: input.driverContact } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    if (input.items !== undefined) {
      await prisma.reservationItem.deleteMany({ where: { reservationVersionId: base.id } });
      await prisma.reservationItem.createMany({
        data: input.items.map((item) => ({
          reservationVersionId: base.id,
          transportUnitId: item.transportUnitId,
          quantity: item.quantity,
          goodsWeightKg: item.goodsWeightKg ?? null,
          description: item.description ?? null,
        })),
      });
    }

    if (input.advices !== undefined) {
      await prisma.reservationAdvice.deleteMany({ where: { reservationVersionId: base.id } });
      if (input.advices.length > 0) {
        await prisma.reservationAdvice.createMany({
          data: input.advices.map((a) => ({
            reservationVersionId: base.id,
            adviceNumber: a.adviceNumber,
            quantity: a.quantity,
            note: a.note ?? null,
          })),
        });
      }
    }

    await auditLog({
      entityType: "reservation",
      entityId: reservation.id,
      action: "updated",
      newData: { directEdit: true },
      userId: user.id,
    });
  } else {
    // Critical change by non-admin → create pending version for approval
    const newVersion = await prisma.reservationVersion.create({
      data: {
        reservationId: reservation.id,
        startTime: input.startTime ? new Date(input.startTime) : base.startTime,
        durationMinutes: input.durationMinutes ?? base.durationMinutes,
        vehicleType: (input.vehicleType as VehicleType) ?? base.vehicleType,
        licensePlate: input.licensePlate !== undefined ? input.licensePlate : base.licensePlate,
        sealNumbers: input.sealNumbers !== undefined ? input.sealNumbers : base.sealNumbers,
        driverName: input.driverName !== undefined ? input.driverName : base.driverName,
        driverContact: input.driverContact !== undefined ? input.driverContact : base.driverContact,
        notes: input.notes !== undefined ? input.notes : base.notes,
        createdById: user.id,
        items: {
          create: (input.items ?? base.items.map((i) => ({
            transportUnitId: i.transportUnitId,
            quantity: i.quantity,
            goodsWeightKg: i.goodsWeightKg ? Number(i.goodsWeightKg) : null,
            description: i.description,
          }))).map((item) => ({
            transportUnitId: item.transportUnitId,
            quantity: item.quantity,
            goodsWeightKg: item.goodsWeightKg ?? null,
            description: item.description ?? null,
          })),
        },
        advices: {
          create: (input.advices ?? base.advices.map((a) => ({
            adviceNumber: a.adviceNumber,
            quantity: a.quantity,
            note: a.note,
          }))).map((a) => ({
            adviceNumber: a.adviceNumber,
            quantity: a.quantity,
            note: a.note ?? null,
          })),
        },
      },
    });

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { pendingVersionId: newVersion.id },
    });

    await auditLog({
      entityType: "reservation",
      entityId: reservation.id,
      action: "version_proposed",
      oldData: { confirmedVersionId: base.id },
      newData: { pendingVersionId: newVersion.id },
      userId: user.id,
    });
  }

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservation.id}`);
  revalidatePath("/reservations");

  // In-app notification for critical changes needing approval
  if (isCritical && !isAdmin) {
    createNotificationsForEvent({
      type: "CHANGE_REQUESTED",
      reservationId: reservation.id,
      title: reservation.gate.name,
      message: "",
      warehouseId: reservation.gate.warehouseId,
      clientId: reservation.clientId,
      supplierId: reservation.supplierId,
    }).catch(console.error);
  }

  return { success: true, isCritical: isCritical && !isAdmin };
}
