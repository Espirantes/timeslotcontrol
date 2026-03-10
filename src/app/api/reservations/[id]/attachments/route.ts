import { NextRequest, NextResponse } from "next/server";
import { cachedAuth as auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { auditLog } from "@/lib/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

// POST — upload file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: reservationId } = await params;
  const user = session.user;

  // Fetch reservation + check access
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      clientId: true,
      supplierId: true,
      pendingVersionId: true,
      confirmedVersionId: true,
      gate: { select: { warehouseId: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Visibility check
  if (user.role === "CLIENT" && user.clientId !== reservation.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "SUPPLIER" && user.supplierId !== reservation.supplierId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "WAREHOUSE_WORKER" && !user.warehouseIds?.includes(reservation.gate.warehouseId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Editability check
  const canEdit =
    (reservation.status === "REQUESTED" && !!reservation.pendingVersionId) ||
    (reservation.status === "CONFIRMED" && !!reservation.confirmedVersionId);
  if (!canEdit) {
    return NextResponse.json({ error: "Cannot upload in current status" }, { status: 400 });
  }

  // Parse FormData
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Create storage key
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `reservations/${reservationId}/${timestamp}-${safeName}`;

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.upload(storageKey, buffer, file.type);

  // Create DB record
  const attachment = await prisma.reservationAttachment.create({
    data: {
      reservationId,
      storageKey,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      uploadedById: user.id,
    },
  });

  await auditLog({
    entityType: "reservation_attachment",
    entityId: attachment.id,
    action: "created",
    newData: { originalName: file.name, reservationId },
    userId: user.id,
  });

  return NextResponse.json({
    success: true,
    attachment: {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    },
  });
}
