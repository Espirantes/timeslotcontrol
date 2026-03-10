"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireClient() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "CLIENT") throw new Error("Client only");
  if (!session.user.clientId) throw new Error("No client linked");
  if (!session.user.canManageSuppliers) throw new Error("Not authorized to manage suppliers");
  return session.user;
}

export type MySupplierUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export type MySupplier = {
  id: string;
  name: string;
  contactEmail: string | null;
  users: MySupplierUser[];
};

export async function getMySuppliers(): Promise<MySupplier[]> {
  const user = await requireClient();

  const links = await prisma.clientSupplier.findMany({
    where: { clientId: user.clientId! },
    include: {
      supplier: {
        include: {
          users: {
            where: { role: "SUPPLIER" },
            select: { id: true, name: true, email: true, isActive: true },
          },
        },
      },
    },
    orderBy: { supplier: { name: "asc" } },
  });

  return links.map((l) => ({
    id: l.supplier.id,
    name: l.supplier.name,
    contactEmail: l.supplier.contactEmail,
    users: l.supplier.users,
  }));
}

export async function createSupplierWithUser(data: {
  // Supplier (existing or new)
  supplierId?: string;
  supplierName?: string;
  supplierEmail?: string;
  // User
  userName: string;
  userEmail: string;
  userPassword: string;
}) {
  const user = await requireClient();
  const clientId = user.clientId!;

  if (!data.userName.trim() || !data.userEmail.trim() || !data.userPassword) {
    throw new Error("Missing required fields");
  }
  if (data.userPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: data.userEmail } });
  if (existing) throw new Error("EMAIL_EXISTS");

  let supplierId: string;

  if (data.supplierId) {
    // Existing supplier — verify it belongs to this client
    const link = await prisma.clientSupplier.findUnique({
      where: { clientId_supplierId: { clientId, supplierId: data.supplierId } },
    });
    if (!link) throw new Error("Supplier not linked to your organization");
    supplierId = data.supplierId;
  } else {
    // Create new supplier — link ONLY to this client
    if (!data.supplierName?.trim()) throw new Error("Supplier name required");
    const supplier = await prisma.supplier.create({
      data: {
        name: data.supplierName,
        contactEmail: data.supplierEmail || null,
        clients: { create: { clientId } },
      },
    });
    supplierId = supplier.id;

    await auditLog({
      entityType: "supplier",
      entityId: supplier.id,
      action: "created",
      newData: { name: data.supplierName, createdByClient: clientId },
      userId: user.id,
    });
  }

  // Create user — auto-verified
  const hashedPassword = await bcrypt.hash(data.userPassword, 12);
  const newUser = await prisma.user.create({
    data: {
      email: data.userEmail,
      name: data.userName,
      password: hashedPassword,
      role: "SUPPLIER",
      supplierId,
      isVerified: true,
    },
  });

  await auditLog({
    entityType: "user",
    entityId: newUser.id,
    action: "created",
    newData: { email: data.userEmail, role: "SUPPLIER", createdByClient: clientId },
    userId: user.id,
  });

  revalidatePath("/my-suppliers");
  return { success: true };
}

export async function deactivateSupplierUser(userId: string) {
  const user = await requireClient();
  const clientId = user.clientId!;

  // Verify the user belongs to a supplier linked to this client
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { supplierId: true },
  });

  if (!targetUser?.supplierId) throw new Error("User not found");

  const link = await prisma.clientSupplier.findUnique({
    where: { clientId_supplierId: { clientId, supplierId: targetUser.supplierId } },
  });
  if (!link) throw new Error("Not authorized");

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await auditLog({
    entityType: "user",
    entityId: userId,
    action: "deactivated",
    newData: { isActive: false, deactivatedByClient: clientId },
    userId: user.id,
  });

  revalidatePath("/my-suppliers");
}
