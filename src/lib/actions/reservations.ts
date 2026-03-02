"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { VehicleType, TransportUnitType } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationItemInput = {
  unitType: TransportUnitType;
  quantity: number;
  weightKg?: number | null;
  description?: string | null;
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns supplier id for current user, throwing if not a supplier */
async function requireSupplierOrWorker() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** Check if a gate slot is free (no confirmed reservation overlapping) */
async function isSlotFree(
  gateId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string
) {
  const conflicting = await prisma.reservationVersion.findFirst({
    where: {
      confirmedByReservation: {
        gateId,
        status: { in: ["CONFIRMED", "UNLOADING_STARTED"] },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      startTime: { lt: endTime },
      // end time > startTime: startTime + durationMinutes > startTime
    },
  });

  if (conflicting) {
    const conflEnd = new Date(
      conflicting.startTime.getTime() + conflicting.durationMinutes * 60 * 1000
    );
    if (conflEnd > startTime) return false;
  }
  return true;
}

/** Check if gate is open at the given time */
async function isGateOpen(gateId: string, startTime: Date, endTime: Date) {
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
  const user = await requireSupplierOrWorker();
  const { role, supplierId } = user;

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
  if (!await isGateOpen(input.gateId, startTime, endTime)) throw new Error("Gate is closed at requested time");
  if (!await isSlotFree(input.gateId, startTime, endTime)) throw new Error("Slot is already taken");

  const reservation = await prisma.reservation.create({
    data: {
      gateId: input.gateId,
      clientId: input.clientId,
      supplierId: resolvedSupplierId,
      status: "REQUESTED",
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
              unitType: item.unitType,
              quantity: item.quantity,
              weightKg: item.weightKg ?? null,
              description: item.description ?? null,
            })),
          },
        },
      },
    },
    include: { versions: true },
  });

  // Set pendingVersionId to the created version
  const versionId = reservation.versions[0].id;
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { pendingVersionId: versionId },
  });

  await auditLog({
    entityType: "reservation",
    entityId: reservation.id,
    action: "created",
    newData: { status: "REQUESTED", startTime: input.startTime, durationMinutes: input.durationMinutes },
    userId: user.id,
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/reservations");
  return { success: true, reservationId: reservation.id };
}

export async function approveReservation(reservationId: string) {
  const user = await requireSupplierOrWorker();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can approve reservations");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { pendingVersion: true, confirmedVersion: true },
  });

  if (!reservation.pendingVersionId) throw new Error("No pending version to approve");

  const pendingVersion = reservation.pendingVersion!;
  const endTime = new Date(pendingVersion.startTime.getTime() + pendingVersion.durationMinutes * 60 * 1000);

  // Check slot is still free (excluding current reservation)
  if (!await isSlotFree(reservation.gateId, pendingVersion.startTime, endTime, reservationId)) {
    throw new Error("Slot is no longer available");
  }

  const oldStatus = reservation.status;
  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: "CONFIRMED",
      confirmedVersionId: reservation.pendingVersionId,
      pendingVersionId: null,
    },
  });

  await auditLog({
    entityType: "reservation",
    entityId: reservationId,
    action: "version_approved",
    oldData: { status: oldStatus },
    newData: { status: "CONFIRMED", confirmedVersionId: reservation.pendingVersionId },
    userId: user.id,
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath(`/dashboard/reservations/${reservationId}`);
  return { success: true };
}

export async function rejectReservation(reservationId: string) {
  const user = await requireSupplierOrWorker();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can reject reservations");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  const wasNew = reservation.status === "REQUESTED" && !reservation.confirmedVersionId;

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      // If it was a brand new request with no confirmed version → cancel
      status: wasNew ? "CANCELLED" : reservation.status,
      pendingVersionId: null,
    },
  });

  await auditLog({
    entityType: "reservation",
    entityId: reservationId,
    action: "version_rejected",
    oldData: { status: reservation.status },
    newData: { pendingVersionId: null },
    userId: user.id,
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath(`/dashboard/reservations/${reservationId}`);
  return { success: true };
}

export async function updateReservationStatus(
  reservationId: string,
  newStatus: "UNLOADING_STARTED" | "UNLOADING_COMPLETED" | "CLOSED" | "CANCELLED"
) {
  const user = await requireSupplierOrWorker();
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE_WORKER") {
    throw new Error("Only workers can change reservation status");
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  const allowed: Record<string, string[]> = {
    CONFIRMED: ["UNLOADING_STARTED", "CANCELLED"],
    UNLOADING_STARTED: ["UNLOADING_COMPLETED"],
    UNLOADING_COMPLETED: ["CLOSED"],
  };

  if (!allowed[reservation.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${reservation.status} to ${newStatus}`);
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: newStatus },
  });

  await auditLog({
    entityType: "reservation",
    entityId: reservationId,
    action: "status_changed",
    oldData: { status: reservation.status },
    newData: { status: newStatus },
    userId: user.id,
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath(`/dashboard/reservations/${reservationId}`);
  return { success: true };
}

// ─── List / detail queries ────────────────────────────────────────────────────

export type ReservationListItem = {
  id: string;
  status: string;
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

  const { role, warehouseId, clientId, supplierId } = session.user;

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(role === "WAREHOUSE_WORKER" && warehouseId
        ? { gate: { warehouseId } }
        : {}),
      ...(role === "ADMIN" ? {} : {}),
      ...(role === "CLIENT" && clientId ? { clientId } : {}),
      ...(role === "SUPPLIER" && supplierId ? { supplierId } : {}),
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

// ─── Form data helpers ────────────────────────────────────────────────────────

export async function getFormData(warehouseId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, supplierId, clientId } = session.user;

  const gates = await prisma.gates.findMany({
    where: { warehouseId, isActive: true },
    include: { openingHours: true },
    orderBy: { name: "asc" },
  });

  let clients: { id: string; name: string }[] = [];

  if (role === "SUPPLIER" && supplierId) {
    const links = await prisma.clientSupplier.findMany({
      where: { supplierId },
      include: { client: true },
    });
    clients = links.map((l) => ({ id: l.client.id, name: l.client.name }));
  } else if (role === "CLIENT" && clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (client) clients = [{ id: client.id, name: client.name }];
  } else if (role === "ADMIN" || role === "WAREHOUSE_WORKER") {
    clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  }

  return {
    gates: gates.map((g) => ({
      id: g.id,
      name: g.name,
      openingHours: g.openingHours,
    })),
    clients,
  };
}
