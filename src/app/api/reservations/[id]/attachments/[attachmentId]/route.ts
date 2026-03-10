import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { auditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

// GET — download file
export async function GET(
  _req: NextRequest,
  { params }: Params,
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: reservationId, attachmentId } = await params;
  const user = session.user;

  const attachment = await prisma.reservationAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      reservation: {
        select: { clientId: true, supplierId: true, gate: { select: { warehouseId: true } } },
      },
    },
  });

  if (!attachment || attachment.reservationId !== reservationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Visibility check
  const r = attachment.reservation;
  if (user.role === "CLIENT" && user.clientId !== r.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "SUPPLIER" && user.supplierId !== r.supplierId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "WAREHOUSE_WORKER" && !user.warehouseIds?.includes(r.gate.warehouseId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { buffer } = await storage.download(attachment.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}

// DELETE — remove file
export async function DELETE(
  _req: NextRequest,
  { params }: Params,
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: reservationId, attachmentId } = await params;
  const user = session.user;

  const attachment = await prisma.reservationAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      reservation: {
        select: {
          status: true,
          clientId: true,
          supplierId: true,
          pendingVersionId: true,
          confirmedVersionId: true,
          gate: { select: { warehouseId: true } },
        },
      },
    },
  });

  if (!attachment || attachment.reservationId !== reservationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const r = attachment.reservation;

  // Access check
  if (user.role === "CLIENT" && user.clientId !== r.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "SUPPLIER" && user.supplierId !== r.supplierId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "WAREHOUSE_WORKER" && !user.warehouseIds?.includes(r.gate.warehouseId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Editability check
  const canEdit =
    (r.status === "REQUESTED" && !!r.pendingVersionId) ||
    (r.status === "CONFIRMED" && !!r.confirmedVersionId);
  if (!canEdit) {
    return NextResponse.json({ error: "Cannot delete in current status" }, { status: 400 });
  }

  // Delete from storage + DB
  await storage.delete(attachment.storageKey);
  await prisma.reservationAttachment.delete({ where: { id: attachmentId } });

  await auditLog({
    entityType: "reservation_attachment",
    entityId: attachmentId,
    action: "deleted",
    oldData: { originalName: attachment.originalName, reservationId },
    userId: user.id,
  });

  return NextResponse.json({ success: true });
}
