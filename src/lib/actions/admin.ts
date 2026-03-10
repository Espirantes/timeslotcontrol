"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/generated/prisma/client";
import {
  WarehouseSchema, GateSchema, GateUpdateSchema, GateOpeningHoursRowSchema, GateBlockSchema,
  ClientSchema, SupplierSchema, CreateUserSchema, UpdateUserSchema, TransportUnitSchema,
} from "@/lib/schemas";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Admin only");
  return session.user;
}

async function requireAdminOrWorker() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "WAREHOUSE_WORKER") throw new Error("Admin or worker only");
  return session.user;
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export async function getWarehouses() {
  await requireAdmin();
  return prisma.warehouse.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, address: true, timezone: true, country: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createWarehouse(data: { name: string; address?: string; timezone?: string; country?: string }) {
  const user = await requireAdmin();
  const d = WarehouseSchema.parse(data);
  const warehouse = await prisma.warehouse.create({
    data: { name: d.name, address: d.address || null, timezone: d.timezone || "Europe/Prague", country: d.country || null },
  });
  await auditLog({ entityType: "warehouse", entityId: warehouse.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/warehouses");
  return warehouse;
}

export async function updateWarehouse(id: string, data: { name: string; address?: string; timezone?: string; country?: string; isActive?: boolean }) {
  const user = await requireAdmin();
  const d = WarehouseSchema.parse(data);
  const old = await prisma.warehouse.findUniqueOrThrow({ where: { id } });
  const warehouse = await prisma.warehouse.update({ where: { id }, data: d });
  await auditLog({ entityType: "warehouse", entityId: id, action: "updated", oldData: { name: old.name, address: old.address }, newData: d, userId: user.id });
  revalidatePath("/warehouses");
  return warehouse;
}

export async function deleteWarehouse(id: string) {
  const user = await requireAdmin();
  const old = await prisma.warehouse.findUniqueOrThrow({ where: { id }, select: { name: true, address: true } });
  await prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({ entityType: "warehouse", entityId: id, action: "deleted", oldData: old, userId: user.id });
  revalidatePath("/warehouses");
}

// ─── Gates ────────────────────────────────────────────────────────────────────

export async function getGates() {
  await requireAdmin();
  return prisma.gates.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      warehouseId: true,
      name: true,
      description: true,
      isActive: true,
      sortOrder: true,
      warehouse: { select: { id: true, name: true } },
      openingHours: { orderBy: { dayOfWeek: "asc" } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createGate(data: { warehouseId: string; name: string; description?: string; sortOrder?: number }) {
  const user = await requireAdmin();
  const d = GateSchema.parse(data);
  const gate = await prisma.gates.create({
    data: { warehouseId: d.warehouseId, name: d.name, description: d.description || null, sortOrder: d.sortOrder ?? 0 },
  });
  await auditLog({ entityType: "gate", entityId: gate.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/gates");
  return gate;
}

export async function updateGate(id: string, data: { name: string; description?: string; isActive?: boolean; sortOrder?: number }) {
  const user = await requireAdmin();
  const d = GateUpdateSchema.parse(data);
  const old = await prisma.gates.findUniqueOrThrow({ where: { id } });
  const gate = await prisma.gates.update({ where: { id }, data: d });
  await auditLog({ entityType: "gate", entityId: id, action: "updated", oldData: { name: old.name }, newData: d, userId: user.id });
  revalidatePath("/gates");
  return gate;
}

export async function updateGateOpeningHours(
  gateId: string,
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }[]
) {
  const user = await requireAdmin();
  const validatedHours = hours.map((h) => GateOpeningHoursRowSchema.parse(h));
  await prisma.$transaction(
    validatedHours.map((h) =>
      prisma.gateOpeningHours.upsert({
        where: { gateId_dayOfWeek: { gateId, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
        create: { gateId, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
      })
    )
  );
  await auditLog({ entityType: "gate", entityId: gateId, action: "updated", newData: { openingHours: validatedHours }, userId: user.id });
  revalidatePath("/gates");
}

export async function deleteGate(id: string) {
  const user = await requireAdmin();
  const old = await prisma.gates.findUniqueOrThrow({ where: { id }, select: { name: true, warehouseId: true } });
  await prisma.gates.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({ entityType: "gate", entityId: id, action: "deleted", oldData: old, userId: user.id });
  revalidatePath("/gates");
}

// ─── Gate Blocks ──────────────────────────────────────────────────────────────

export async function getGateBlocks(gateId: string) {
  await requireAdminOrWorker();
  return prisma.gateBlock.findMany({
    where: { gateId, endTime: { gte: new Date() } },
    include: { createdBy: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });
}

export async function createGateBlock(data: { gateId: string; startTime: string; endTime: string; reason: string }) {
  const user = await requireAdminOrWorker();
  const d = GateBlockSchema.parse(data);
  const block = await prisma.gateBlock.create({
    data: {
      gateId: d.gateId,
      startTime: new Date(d.startTime),
      endTime: new Date(d.endTime),
      reason: d.reason,
      createdById: user.id,
    },
  });
  await auditLog({ entityType: "gateBlock", entityId: block.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/calendar");
  revalidatePath("/gates");
  return block;
}

export async function deleteGateBlock(id: string) {
  const user = await requireAdminOrWorker();
  await prisma.gateBlock.delete({ where: { id } });
  await auditLog({ entityType: "gateBlock", entityId: id, action: "deleted", userId: user.id });
  revalidatePath("/calendar");
  revalidatePath("/gates");
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients() {
  await requireAdmin();
  return prisma.client.findMany({
    where: { deletedAt: null },
    include: {
      suppliers: { include: { supplier: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function bulkToggleCanManageSuppliers(enable: boolean) {
  const user = await requireAdmin();
  await prisma.client.updateMany({ data: { canManageSuppliers: enable } });
  await auditLog({ entityType: "client", entityId: "ALL", action: "bulk_updated", newData: { canManageSuppliers: enable }, userId: user.id });
  revalidatePath("/clients");
}

export async function createClient(data: { name: string; contactEmail?: string }) {
  const user = await requireAdmin();
  const d = ClientSchema.parse(data);
  const client = await prisma.client.create({
    data: { name: d.name, contactEmail: d.contactEmail || null },
  });
  await auditLog({ entityType: "client", entityId: client.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, data: { name: string; contactEmail?: string; canManageSuppliers?: boolean }) {
  const user = await requireAdmin();
  const d = ClientSchema.parse(data);
  const old = await prisma.client.findUniqueOrThrow({ where: { id } });
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: d.name,
      contactEmail: d.contactEmail || null,
      ...(d.canManageSuppliers !== undefined ? { canManageSuppliers: d.canManageSuppliers } : {}),
    },
  });
  await auditLog({ entityType: "client", entityId: id, action: "updated", oldData: { name: old.name }, newData: d, userId: user.id });
  revalidatePath("/clients");
  return client;
}

export async function deleteClient(id: string) {
  const user = await requireAdmin();
  const old = await prisma.client.findUniqueOrThrow({ where: { id }, select: { name: true, contactEmail: true } });
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({ entityType: "client", entityId: id, action: "deleted", oldData: old, userId: user.id });
  revalidatePath("/clients");
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers() {
  await requireAdmin();
  return prisma.supplier.findMany({
    where: { deletedAt: null },
    include: { clients: { include: { client: true } }, _count: { select: { reservations: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(data: { name: string; contactEmail?: string; clientIds?: string[] }) {
  const user = await requireAdmin();
  const d = SupplierSchema.parse(data);
  const supplier = await prisma.supplier.create({
    data: {
      name: d.name,
      contactEmail: d.contactEmail || null,
      clients: d.clientIds?.length
        ? { create: d.clientIds.map((clientId) => ({ clientId })) }
        : undefined,
    },
  });
  await auditLog({ entityType: "supplier", entityId: supplier.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/suppliers");
  return supplier;
}

export async function updateSupplier(id: string, data: { name: string; contactEmail?: string; clientIds?: string[] }) {
  const user = await requireAdmin();
  const d = SupplierSchema.parse(data);
  const old = await prisma.supplier.findUniqueOrThrow({ where: { id } });

  await prisma.supplier.update({
    where: { id },
    data: { name: d.name, contactEmail: d.contactEmail || null },
  });

  if (d.clientIds !== undefined) {
    await prisma.clientSupplier.deleteMany({ where: { supplierId: id } });
    if (d.clientIds.length > 0) {
      await prisma.clientSupplier.createMany({
        data: d.clientIds.map((clientId) => ({ clientId, supplierId: id })),
      });
    }
  }

  await auditLog({ entityType: "supplier", entityId: id, action: "updated", oldData: { name: old.name }, newData: d, userId: user.id });
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: string) {
  const user = await requireAdmin();
  const old = await prisma.supplier.findUniqueOrThrow({ where: { id }, select: { name: true, contactEmail: true } });
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({ entityType: "supplier", entityId: id, action: "deleted", oldData: old, userId: user.id });
  revalidatePath("/suppliers");
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      isVerified: true,
      registrationMessage: true,
      clientId: true,
      supplierId: true,
      createdAt: true,
      warehouses: { include: { warehouse: true } },
      client: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPendingUsersCount() {
  await requireAdmin();
  return prisma.user.count({ where: { isVerified: false, isActive: true } });
}

export async function approveUser(userId: string, supplierId: string) {
  const admin = await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true, supplierId },
  });

  await auditLog({
    entityType: "user",
    entityId: userId,
    action: "approved",
    newData: { isVerified: true, supplierId },
    userId: admin.id,
  });

  // Notify user
  const { createUserApprovalNotification } = await import("@/lib/actions/notifications");
  const { notifyUserApproved } = await import("@/lib/email");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  createUserApprovalNotification(userId, true).catch(console.error);
  if (user) notifyUserApproved({ userEmail: user.email }).catch(console.error);

  revalidatePath("/users");
}

export async function rejectUser(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, isVerified: false },
  });

  await auditLog({
    entityType: "user",
    entityId: userId,
    action: "rejected",
    newData: { isActive: false },
    userId: admin.id,
  });

  // Notify user
  const { createUserApprovalNotification } = await import("@/lib/actions/notifications");
  const { notifyUserRejected } = await import("@/lib/email");
  createUserApprovalNotification(userId, false).catch(console.error);
  if (user) notifyUserRejected({ userEmail: user.email }).catch(console.error);

  revalidatePath("/users");
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  warehouseIds?: string[];
  clientId?: string;
  supplierId?: string;
}) {
  const user = await requireAdmin();
  const d = CreateUserSchema.parse(data);
  const hashedPassword = await bcrypt.hash(d.password, 12);
  const newUser = await prisma.user.create({
    data: {
      email: d.email,
      name: d.name,
      password: hashedPassword,
      role: d.role,
      clientId: d.clientId || null,
      supplierId: d.supplierId || null,
      warehouses: d.warehouseIds?.length
        ? { create: d.warehouseIds.map((warehouseId) => ({ warehouseId })) }
        : undefined,
    },
  });
  await auditLog({ entityType: "user", entityId: newUser.id, action: "created", newData: { email: d.email, role: d.role }, userId: user.id });
  revalidatePath("/users");
  // H2: Strip password hash from response
  const { password: _, ...safeUser } = newUser;
  return safeUser;
}

export async function updateUser(id: string, data: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  warehouseIds?: string[];
  clientId?: string;
  supplierId?: string;
  isActive?: boolean;
}) {
  const admin = await requireAdmin();
  const d = UpdateUserSchema.parse(data);
  const old = await prisma.user.findUniqueOrThrow({ where: { id } });

  const updateData: Record<string, unknown> = {
    email: d.email,
    name: d.name,
    role: d.role,
    clientId: d.clientId || null,
    supplierId: d.supplierId || null,
    isActive: d.isActive ?? old.isActive,
  };

  if (d.password) {
    updateData.password = await bcrypt.hash(d.password, 12);
  }

  await prisma.user.update({ where: { id }, data: updateData });

  // Sync warehouse assignments
  if (d.warehouseIds !== undefined) {
    await prisma.userWarehouse.deleteMany({ where: { userId: id } });
    if (d.warehouseIds.length > 0) {
      await prisma.userWarehouse.createMany({
        data: d.warehouseIds.map((warehouseId) => ({ userId: id, warehouseId })),
      });
    }
  }

  await auditLog({ entityType: "user", entityId: id, action: "updated", oldData: { email: old.email, role: old.role }, newData: { email: d.email, role: d.role }, userId: admin.id });
  revalidatePath("/users");
}

export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await auditLog({ entityType: "user", entityId: id, action: "updated", newData: { isActive: false }, userId: admin.id });
  revalidatePath("/users");
}

// ─── Transport Units ─────────────────────────────────────────────────────────

export async function getTransportUnits() {
  await requireAdmin();
  return prisma.transportUnit.findMany({
    select: { id: true, name: true, weightKg: true, processingMinutes: true, isActive: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createTransportUnit(data: {
  name: string;
  weightKg: number;
  processingMinutes: number;
  sortOrder?: number;
}) {
  const user = await requireAdmin();
  const d = TransportUnitSchema.parse(data);
  const tu = await prisma.transportUnit.create({
    data: {
      name: d.name,
      weightKg: d.weightKg,
      processingMinutes: d.processingMinutes,
      sortOrder: d.sortOrder ?? 0,
    },
  });
  await auditLog({ entityType: "transportUnit", entityId: tu.id, action: "created", newData: d, userId: user.id });
  revalidatePath("/transport-units");
  return tu;
}

export async function updateTransportUnit(
  id: string,
  data: { name: string; weightKg: number; processingMinutes: number; isActive?: boolean; sortOrder?: number }
) {
  const user = await requireAdmin();
  const d = TransportUnitSchema.parse(data);
  const old = await prisma.transportUnit.findUniqueOrThrow({ where: { id } });
  const tu = await prisma.transportUnit.update({ where: { id }, data: d });
  await auditLog({ entityType: "transportUnit", entityId: id, action: "updated", oldData: { name: old.name }, newData: d, userId: user.id });
  revalidatePath("/transport-units");
  return tu;
}

export async function deleteTransportUnit(id: string) {
  const user = await requireAdmin();
  // Soft delete to preserve history
  await prisma.transportUnit.update({ where: { id }, data: { isActive: false } });
  await auditLog({ entityType: "transportUnit", entityId: id, action: "updated", newData: { isActive: false }, userId: user.id });
  revalidatePath("/transport-units");
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditLogItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldData: unknown;
  newData: unknown;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
};

export async function getAuditLogs(params?: {
  entityType?: string;
  take?: number;
  skip?: number;
}): Promise<{ items: AuditLogItem[]; total: number }> {
  await requireAdmin();

  const where = params?.entityType ? { entityType: params.entityType } : {};
  const take = params?.take ?? 50;
  const skip = params?.skip ?? 0;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((i) => ({
      id: i.id,
      entityType: i.entityType,
      entityId: i.entityId,
      action: i.action,
      oldData: i.oldData,
      newData: i.newData,
      userName: i.user?.name ?? null,
      userEmail: i.user?.email ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
    total,
  };
}
