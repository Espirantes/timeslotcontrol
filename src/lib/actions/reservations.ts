"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { VehicleType } from "@/generated/prisma/client";
import {
  notifyReservationCreated,
  notifyReservationApproved,
  notifyReservationRejected,
  notifyStatusChanged,
} from "@/lib/email";
import { createNotificationsForEvent } from "@/lib/actions/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationItemInput = {
  transportUnitId: string;
  quantity: number;
  goodsWeightKg?: number | null;
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

/** Returns supplier id for current user, throwing if not a supplier */
async function requireSupplierOrWorker() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** Check if a gate slot is free (no confirmed reservation overlapping) */
export async function isSlotFree(
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
  if (role !== "ADMIN" && !await isGateOpen(input.gateId, startTime, endTime)) throw new Error("Gate is closed at requested time");
  if (!await isSlotFree(input.gateId, startTime, endTime)) throw new Error("Slot is already taken");

  const isAdminCreate = role === "ADMIN";
  const reservation = await prisma.reservation.create({
    data: {
      gateId: input.gateId,
      clientId: input.clientId,
      supplierId: resolvedSupplierId,
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
        },
      },
    },
    include: { versions: true },
  });

  // Set version pointer — admin confirms immediately, others go to pending
  const versionId = reservation.versions[0].id;
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: isAdminCreate
      ? { confirmedVersionId: versionId }
      : { pendingVersionId: versionId },
  });

  await auditLog({
    entityType: "reservation",
    entityId: reservation.id,
    action: "created",
    newData: { status: isAdminCreate ? "CONFIRMED" : "REQUESTED", startTime: input.startTime, durationMinutes: input.durationMinutes },
    userId: user.id,
  });

  revalidatePath("/calendar");
  revalidatePath("/reservations");

  // Email notification to warehouse workers
  const gate = await prisma.gates.findUnique({ where: { id: input.gateId }, include: { warehouse: true } });
  const supplier = await prisma.supplier.findUnique({ where: { id: resolvedSupplierId } });
  const workers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "WAREHOUSE_WORKER"] },
      warehouseId: gate?.warehouseId,
      isActive: true,
      notifyEmail: true,
    },
    select: { email: true },
  });
  notifyReservationCreated({
    reservationId: reservation.id,
    gateName: gate?.name ?? "",
    supplierName: supplier?.name ?? "",
    startTime: input.startTime,
    workerEmails: workers.map((w) => w.email),
  }).catch(() => {});

  // In-app notification
  createNotificationsForEvent({
    type: "RESERVATION_CREATED",
    reservationId: reservation.id,
    title: `${gate?.name ?? ""}`,
    message: `${supplier?.name ?? ""} — ${new Date(input.startTime).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })}`,
    warehouseId: gate?.warehouseId ?? "",
    clientId: input.clientId,
    supplierId: resolvedSupplierId,
  }).catch(() => {});

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

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // Email notification
  const full = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { gate: true, supplier: true, client: true, confirmedVersion: true },
  });
  if (full?.confirmedVersion) {
    const emailRecipients = await getEmailRecipients(full.clientId, full.supplierId);
    notifyReservationApproved({
      reservationId,
      gateName: full.gate.name,
      startTime: full.confirmedVersion.startTime.toISOString(),
      supplierEmail: emailRecipients.supplierEmail,
      clientEmail: emailRecipients.clientEmail,
    }).catch(() => {});

    // In-app notification
    createNotificationsForEvent({
      type: "RESERVATION_APPROVED",
      reservationId,
      title: full.gate.name,
      message: new Date(full.confirmedVersion.startTime).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" }),
      warehouseId: full.gate.warehouseId,
      clientId: full.clientId,
      supplierId: full.supplierId,
    }).catch(() => {});
  }

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

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // Email notification
  const full = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { gate: true, supplier: true, client: true },
  });
  if (full) {
    const emailRecipients = await getEmailRecipients(full.clientId, full.supplierId);
    notifyReservationRejected({
      reservationId,
      gateName: full.gate.name,
      supplierEmail: emailRecipients.supplierEmail,
      clientEmail: emailRecipients.clientEmail,
    }).catch(() => {});

    // In-app notification
    createNotificationsForEvent({
      type: "RESERVATION_REJECTED",
      reservationId,
      title: full.gate.name,
      message: "",
      warehouseId: full.gate.warehouseId,
      clientId: full.clientId,
      supplierId: full.supplierId,
    }).catch(() => {});
  }

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

  revalidatePath("/calendar");
  revalidatePath(`/reservations/${reservationId}`);

  // Email notification
  const full = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { gate: true, supplier: true, client: true },
  });
  if (full) {
    const emailRecipients = await getEmailRecipients(full.clientId, full.supplierId);
    notifyStatusChanged({
      reservationId,
      gateName: full.gate.name,
      newStatus,
      supplierEmail: emailRecipients.supplierEmail,
      clientEmail: emailRecipients.clientEmail,
    }).catch(() => {});

    const statusLabels: Record<string, string> = {
      UNLOADING_STARTED: "Vykládka zahájena",
      UNLOADING_COMPLETED: "Vykládka dokončena",
      CLOSED: "Uzavřeno",
      CANCELLED: "Zrušeno",
    };

    // In-app notification
    createNotificationsForEvent({
      type: "STATUS_CHANGED",
      reservationId,
      title: full.gate.name,
      message: statusLabels[newStatus] ?? newStatus,
      warehouseId: full.gate.warehouseId,
      clientId: full.clientId,
      supplierId: full.supplierId,
    }).catch(() => {});
  }

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
};

export type ReservationDetail = {
  id: string;
  status: string;
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
};

function mapVersion(
  v: Awaited<ReturnType<typeof prisma.reservationVersion.findUnique>> & {
    createdBy: { name: string };
    items: { id: string; transportUnitId: string; transportUnit: { name: string; weightKg: unknown }; quantity: number; goodsWeightKg: unknown; description: string | null }[];
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
  };
}

export async function getReservationDetail(reservationId: string): Promise<ReservationDetail | null> {
  const session = await auth();
  if (!session) return null;

  const { role, warehouseId, clientId, supplierId } = session.user;

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      gate: { include: { warehouse: true } },
      client: true,
      supplier: true,
      createdBy: true,
      confirmedVersion: { include: { createdBy: true, items: { include: { transportUnit: true } } } },
      pendingVersion: { include: { createdBy: true, items: { include: { transportUnit: true } } } },
    },
  });

  if (!r) return null;

  // Visibility check
  if (role === "WAREHOUSE_WORKER" && warehouseId && r.gate.warehouseId !== warehouseId) return null;
  if (role === "CLIENT" && clientId && r.clientId !== clientId) return null;
  if (role === "SUPPLIER" && supplierId && r.supplierId !== supplierId) return null;

  return {
    id: r.id,
    status: r.status,
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
  };
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

  const transportUnits = await prisma.transportUnit.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, weightKg: true, processingMinutes: true },
  });

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

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: input.reservationId },
    include: {
      gate: true,
      confirmedVersion: { include: { items: true } },
      pendingVersion: { include: { items: true } },
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
    }).catch(() => {});
  }

  return { success: true, isCritical: isCritical && !isAdmin };
}
