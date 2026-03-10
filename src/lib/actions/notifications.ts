"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { NotificationType } from "@/generated/prisma/client";

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

// ─── Create notifications for an event ────────────────────────────────────────

export async function createNotificationsForEvent(params: {
  type: NotificationType;
  reservationId: string;
  title: string;
  message: string;
  warehouseId: string;
  clientId: string;
  supplierId: string;
}) {
  // H1: Auth guard — this is exposed as a server action, so verify authentication
  await requireAuth();
  const { type, reservationId, title, message, warehouseId, clientId, supplierId } = params;

  // Determine recipients based on event type
  let recipients: { id: string }[];

  if (type === "RESERVATION_CREATED" || type === "CHANGE_REQUESTED") {
    // Notify ADMIN + WAREHOUSE_WORKER of the warehouse
    recipients = await prisma.user.findMany({
      where: {
        isActive: true,
        notifyInApp: true,
        OR: [
          { role: "ADMIN" },
          { role: "WAREHOUSE_WORKER", warehouses: { some: { warehouseId } } },
        ],
      },
      select: { id: true },
    });
  } else {
    // APPROVED, REJECTED, STATUS_CHANGED → notify client + supplier users
    recipients = await prisma.user.findMany({
      where: {
        isActive: true,
        notifyInApp: true,
        OR: [{ clientId }, { supplierId }],
      },
      select: { id: true },
    });
  }

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type,
      reservationId,
      title,
      message,
    })),
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

// ─── Registration notifications ──────────────────────────────────────────────

export async function createRegistrationNotification(userId: string, userName: string, userEmail: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, notifyInApp: true },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "USER_REGISTERED" as const,
      title: userName,
      message: userEmail,
    })),
  });
}

export async function createUserApprovalNotification(userId: string, approved: boolean) {
  await prisma.notification.create({
    data: {
      userId,
      type: approved ? ("USER_APPROVED" as const) : ("USER_REJECTED" as const),
      title: approved ? "Account approved" : "Account rejected",
      message: "",
    },
  });
}

export async function markAllAsRead() {
  const user = await getUserBySession();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}
