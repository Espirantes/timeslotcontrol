import { prisma } from "./prisma";

type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "version_approved"
  | "version_rejected"
  | "version_proposed";

export async function auditLog({
  entityType,
  entityId,
  action,
  oldData,
  newData,
  userId,
}: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldData?: object | null;
  newData?: object | null;
  userId?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      oldData: oldData ?? undefined,
      newData: newData ?? undefined,
      userId: userId ?? undefined,
    },
  });
}
