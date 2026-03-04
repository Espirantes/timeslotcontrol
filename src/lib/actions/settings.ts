"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

/** Lookup user by email (session.user.id may not be set with JWT strategy) */
async function getUserBySession() {
  const sessionUser = await requireAuth();
  return prisma.user.findUniqueOrThrow({
    where: { email: sessionUser.email },
  });
}

// ─── Profile data ─────────────────────────────────────────────────────────────

export type ProfileData = {
  name: string;
  email: string;
  role: string;
  createdAt: string;
  organizationName: string | null;
  notifyInApp: boolean;
  notifyBrowser: boolean;
  notifyEmail: boolean;
};

export async function getProfileData(): Promise<ProfileData> {
  const sessionUser = await requireAuth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: sessionUser.email },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      notifyInApp: true,
      notifyBrowser: true,
      notifyEmail: true,
      warehouses: { include: { warehouse: { select: { name: true } } } },
      client: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  let organizationName: string | null = null;
  if (user.warehouses.length > 0) organizationName = user.warehouses.map((w) => w.warehouse.name).join(", ");
  else if (user.client) organizationName = user.client.name;
  else if (user.supplier) organizationName = user.supplier.name;

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    organizationName,
    notifyInApp: user.notifyInApp,
    notifyBrowser: user.notifyBrowser,
    notifyEmail: user.notifyEmail,
  };
}

// ─── Update name ──────────────────────────────────────────────────────────────

export async function updateProfileName(name: string) {
  const dbUser = await getUserBySession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { name: trimmed },
  });

  await auditLog({
    entityType: "user",
    entityId: dbUser.id,
    action: "profile_updated",
    newData: { name: trimmed },
    userId: dbUser.id,
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string) {
  const dbUser = await getUserBySession();

  if (newPassword.length < 8) throw new Error("PASSWORD_TOO_SHORT");

  const valid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!valid) throw new Error("WRONG_PASSWORD");

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { password: hashed },
  });

  await auditLog({
    entityType: "user",
    entityId: dbUser.id,
    action: "password_changed",
    userId: dbUser.id,
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Notification preferences ────────────────────────────────────────────────

export async function updateNotificationPreferences(notifyInApp: boolean, notifyBrowser: boolean, notifyEmail: boolean) {
  const dbUser = await getUserBySession();

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { notifyInApp, notifyBrowser, notifyEmail },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}
