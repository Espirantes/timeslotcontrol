"use server";

// User-facing notification server actions. Internal dispatch helpers
// (createNotificationsForEvent, createRegistrationNotification,
// createUserApprovalNotification) live in `@/lib/notifications-server` and
// are deliberately NOT exposed as RPCs — exposing them here would let any
// authenticated user spoof notifications cross-tenant.

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

async function getUserBySession() {
  const sessionUser = await requireAuth();
  return prisma.user.findUniqueOrThrow({
    where: { email: sessionUser.email },
  });
}

// ─── Queries for client ───────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const user = await getUserBySession();
  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
}

export type NotificationItem = {
  id: string;
  type: string;
  reservationId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  const user = await getUserBySession();
  const clampedLimit = Math.min(Math.max(1, limit), 100); // M10: clamp to safe range

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: clampedLimit,
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    reservationId: r.reservationId,
    title: r.title,
    message: r.message,
    isRead: r.isRead,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markAsRead(notificationId: string) {
  const user = await getUserBySession();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  return { success: true };
}

export async function markAllAsRead() {
  const user = await getUserBySession();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}
