"use server";

import { prisma } from "@/lib/prisma";
import { cachedAuth as auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/generated/prisma/client";

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
    select: { id: true, name: true, address: true, timezone: true, country: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createWarehouse(data: { name: string; address?: string; timezone?: string; country?: string }) {
  const user = await requireAdmin();
  const warehouse = await prisma.warehouse.create({
    data: { name: data.name, address: data.address || null, timezone: data.timezone || "Europe/Prague", country: data.country || null },
  });
  await auditLog({ entityType: "warehouse", entityId: warehouse.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/warehouses");
  return warehouse;
}

export async function updateWarehouse(id: string, data: { name: string; address?: string; timezone?: string; country?: string; isActive?: boolean }) {
  const user = await requireAdmin();
  const old = await prisma.warehouse.findUniqueOrThrow({ where: { id } });
  const warehouse = await prisma.warehouse.update({ where: { id }, data });
  await auditLog({ entityType: "warehouse", entityId: id, action: "updated", oldData: { name: old.name, address: old.address }, newData: data, userId: user.id });
  revalidatePath("/warehouses");
  return warehouse;
}

export async function deleteWarehouse(id: string) {
  const user = await requireAdmin();
  await prisma.warehouse.delete({ where: { id } });
  await auditLog({ entityType: "warehouse", entityId: id, action: "deleted", userId: user.id });
  revalidatePath("/warehouses");
}

// ─── Gates ────────────────────────────────────────────────────────────────────

export async function getGates() {
  await requireAdmin();
  return prisma.gates.findMany({
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
  const gate = await prisma.gates.create({
    data: { warehouseId: data.warehouseId, name: data.name, description: data.description || null, sortOrder: data.sortOrder ?? 0 },
  });
  await auditLog({ entityType: "gate", entityId: gate.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/gates");
  return gate;
}

export async function updateGate(id: string, data: { name: string; description?: string; isActive?: boolean; sortOrder?: number }) {
  const user = await requireAdmin();
  const old = await prisma.gates.findUniqueOrThrow({ where: { id } });
  const gate = await prisma.gates.update({ where: { id }, data });
  await auditLog({ entityType: "gate", entityId: id, action: "updated", oldData: { name: old.name }, newData: data, userId: user.id });
  revalidatePath("/gates");
  return gate;
}

export async function updateGateOpeningHours(
  gateId: string,
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }[]
) {
  const user = await requireAdmin();
  await prisma.$transaction(
    hours.map((h) =>
      prisma.gateOpeningHours.upsert({
        where: { gateId_dayOfWeek: { gateId, dayOfWeek: h.dayOfWeek } },
        update: { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
        create: { gateId, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
      })
    )
  );
  await auditLog({ entityType: "gate", entityId: gateId, action: "updated", newData: { openingHours: hours }, userId: user.id });
  revalidatePath("/gates");
}

export async function deleteGate(id: string) {
  const user = await requireAdmin();
  await prisma.gates.delete({ where: { id } });
  await auditLog({ entityType: "gate", entityId: id, action: "deleted", userId: user.id });
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
  const block = await prisma.gateBlock.create({
    data: {
      gateId: data.gateId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      reason: data.reason,
      createdById: user.id,
    },
  });
  await auditLog({ entityType: "gateBlock", entityId: block.id, action: "created", newData: data, userId: user.id });
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
  const client = await prisma.client.create({
    data: { name: data.name, contactEmail: data.contactEmail || null },
  });
  await auditLog({ entityType: "client", entityId: client.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, data: { name: string; contactEmail?: string; canManageSuppliers?: boolean }) {
  const user = await requireAdmin();
  const old = await prisma.client.findUniqueOrThrow({ where: { id } });
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      contactEmail: data.contactEmail || null,
      ...(data.canManageSuppliers !== undefined ? { canManageSuppliers: data.canManageSuppliers } : {}),
    },
  });
  await auditLog({ entityType: "client", entityId: id, action: "updated", oldData: { name: old.name }, newData: data, userId: user.id });
  revalidatePath("/clients");
  return client;
}

export async function deleteClient(id: string) {
  const user = await requireAdmin();
  await prisma.client.delete({ where: { id } });
  await auditLog({ entityType: "client", entityId: id, action: "deleted", userId: user.id });
  revalidatePath("/clients");
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers() {
  await requireAdmin();
  return prisma.supplier.findMany({
    include: { clients: { include: { client: true } }, _count: { select: { reservations: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(data: { name: string; contactEmail?: string; clientIds?: string[] }) {
  const user = await requireAdmin();
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      contactEmail: data.contactEmail || null,
      clients: data.clientIds?.length
        ? { create: data.clientIds.map((clientId) => ({ clientId })) }
        : undefined,
    },
  });
  await auditLog({ entityType: "supplier", entityId: supplier.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/suppliers");
  return supplier;
}

export async function updateSupplier(id: string, data: { name: string; contactEmail?: string; clientIds?: string[] }) {
  const user = await requireAdmin();
  const old = await prisma.supplier.findUniqueOrThrow({ where: { id } });

  await prisma.supplier.update({
    where: { id },
    data: { name: data.name, contactEmail: data.contactEmail || null },
  });

  if (data.clientIds !== undefined) {
    await prisma.clientSupplier.deleteMany({ where: { supplierId: id } });
    if (data.clientIds.length > 0) {
      await prisma.clientSupplier.createMany({
        data: data.clientIds.map((clientId) => ({ clientId, supplierId: id })),
      });
    }
  }

  await auditLog({ entityType: "supplier", entityId: id, action: "updated", oldData: { name: old.name }, newData: data, userId: user.id });
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: string) {
  const user = await requireAdmin();
  await prisma.supplier.delete({ where: { id } });
  await auditLog({ entityType: "supplier", entityId: id, action: "deleted", userId: user.id });
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
  const hashedPassword = await bcrypt.hash(data.password, 12);
  const newUser = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role,
      clientId: data.clientId || null,
      supplierId: data.supplierId || null,
      warehouses: data.warehouseIds?.length
        ? { create: data.warehouseIds.map((warehouseId) => ({ warehouseId })) }
        : undefined,
    },
  });
  await auditLog({ entityType: "user", entityId: newUser.id, action: "created", newData: { email: data.email, role: data.role }, userId: user.id });
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
  const old = await prisma.user.findUniqueOrThrow({ where: { id } });

  const updateData: Record<string, unknown> = {
    email: data.email,
    name: data.name,
    role: data.role,
    clientId: data.clientId || null,
    supplierId: data.supplierId || null,
    isActive: data.isActive ?? old.isActive,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  await prisma.user.update({ where: { id }, data: updateData });

  // Sync warehouse assignments
  if (data.warehouseIds !== undefined) {
    await prisma.userWarehouse.deleteMany({ where: { userId: id } });
    if (data.warehouseIds.length > 0) {
      await prisma.userWarehouse.createMany({
        data: data.warehouseIds.map((warehouseId) => ({ userId: id, warehouseId })),
      });
    }
  }

  await auditLog({ entityType: "user", entityId: id, action: "updated", oldData: { email: old.email, role: old.role }, newData: { email: data.email, role: data.role }, userId: admin.id });
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
  const tu = await prisma.transportUnit.create({
    data: {
      name: data.name,
      weightKg: data.weightKg,
      processingMinutes: data.processingMinutes,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  await auditLog({ entityType: "transportUnit", entityId: tu.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/transport-units");
  return tu;
}

export async function updateTransportUnit(
  id: string,
  data: { name: string; weightKg: number; processingMinutes: number; isActive?: boolean; sortOrder?: number }
) {
  const user = await requireAdmin();
  const old = await prisma.transportUnit.findUniqueOrThrow({ where: { id } });
  const tu = await prisma.transportUnit.update({ where: { id }, data });
  await auditLog({ entityType: "transportUnit", entityId: id, action: "updated", oldData: { name: old.name }, newData: data, userId: user.id });
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
