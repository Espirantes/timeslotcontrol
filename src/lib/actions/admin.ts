"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

// ─── Warehouses ───────────────────────────────────────────────────────────────

export async function getWarehouses() {
  await requireAdmin();
  return prisma.warehouse.findMany({ orderBy: { name: "asc" } });
}

export async function createWarehouse(data: { name: string; address?: string; timezone?: string }) {
  const user = await requireAdmin();
  const warehouse = await prisma.warehouse.create({
    data: { name: data.name, address: data.address || null, timezone: data.timezone || "Europe/Prague" },
  });
  await auditLog({ entityType: "warehouse", entityId: warehouse.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/warehouses");
  return warehouse;
}

export async function updateWarehouse(id: string, data: { name: string; address?: string; timezone?: string; isActive?: boolean }) {
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
    include: { warehouse: true, openingHours: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: [{ warehouse: { name: "asc" } }, { name: "asc" }],
  });
}

export async function createGate(data: { warehouseId: string; name: string; description?: string }) {
  const user = await requireAdmin();
  const gate = await prisma.gates.create({
    data: { warehouseId: data.warehouseId, name: data.name, description: data.description || null },
  });
  await auditLog({ entityType: "gate", entityId: gate.id, action: "created", newData: data, userId: user.id });
  revalidatePath("/gates");
  return gate;
}

export async function updateGate(id: string, data: { name: string; description?: string; isActive?: boolean }) {
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
  for (const h of hours) {
    await prisma.gateOpeningHours.upsert({
      where: { gateId_dayOfWeek: { gateId, dayOfWeek: h.dayOfWeek } },
      update: { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
      create: { gateId, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
    });
  }
  await auditLog({ entityType: "gate", entityId: gateId, action: "updated", newData: { openingHours: hours }, userId: user.id });
  revalidatePath("/gates");
}

export async function deleteGate(id: string) {
  const user = await requireAdmin();
  await prisma.gates.delete({ where: { id } });
  await auditLog({ entityType: "gate", entityId: id, action: "deleted", userId: user.id });
  revalidatePath("/gates");
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients() {
  await requireAdmin();
  return prisma.client.findMany({
    include: { suppliers: { include: { supplier: true } }, _count: { select: { reservations: true } } },
    orderBy: { name: "asc" },
  });
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

export async function updateClient(id: string, data: { name: string; contactEmail?: string }) {
  const user = await requireAdmin();
  const old = await prisma.client.findUniqueOrThrow({ where: { id } });
  const client = await prisma.client.update({ where: { id }, data });
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
    include: { warehouse: true, client: true, supplier: true },
    orderBy: { name: "asc" },
  });
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  warehouseId?: string;
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
      warehouseId: data.warehouseId || null,
      clientId: data.clientId || null,
      supplierId: data.supplierId || null,
    },
  });
  await auditLog({ entityType: "user", entityId: newUser.id, action: "created", newData: { email: data.email, role: data.role }, userId: user.id });
  revalidatePath("/users");
  return newUser;
}

export async function updateUser(id: string, data: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  warehouseId?: string;
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
    warehouseId: data.warehouseId || null,
    clientId: data.clientId || null,
    supplierId: data.supplierId || null,
    isActive: data.isActive ?? old.isActive,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  await prisma.user.update({ where: { id }, data: updateData });
  await auditLog({ entityType: "user", entityId: id, action: "updated", oldData: { email: old.email, role: old.role }, newData: { email: data.email, role: data.role }, userId: admin.id });
  revalidatePath("/users");
}

export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await auditLog({ entityType: "user", entityId: id, action: "updated", newData: { isActive: false }, userId: admin.id });
  revalidatePath("/users");
}
