// Internal notification helpers. Imported by other server actions / API routes.
// NOT a `"use server"` module: these are not callable as RPCs from the client.
//
// Anything exported here would be exploitable cross-tenant if it were exposed
// as a server action, because the recipient list is computed from the caller's
// arguments rather than the caller's identity. Keep this file out of `lib/actions/`.

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function createNotificationsForEvent(params: {
  type: NotificationType;
  reservationId: string;
  title: string;
  message: string;
  warehouseId: string;
  clientId: string;
  supplierId: string;
}) {
  const { type, reservationId, title, message, warehouseId, clientId, supplierId } = params;

  let recipients: { id: string }[];

  if (type === "RESERVATION_CREATED" || type === "CHANGE_REQUESTED") {
    // Notify ADMIN + WAREHOUSE_WORKER assigned to the reservation's warehouse
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

export async function createRegistrationNotification(_userId: string, userName: string, userEmail: string) {
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
