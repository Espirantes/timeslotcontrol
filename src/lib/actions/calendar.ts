"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { ReservationStatus } from "@/generated/prisma/client";

export type CalendarGate = {
  id: string;
  name: string;
  description: string | null;
};

export type CalendarEvent = {
  id: string;
  resourceId: string; // gate id
  start: string; // ISO
  end: string; // ISO
  title: string;
  status: ReservationStatus;
  isOwn: boolean; // can see detail
  // detail (only if isOwn = true)
  supplierName?: string;
  clientName?: string;
  vehicleType?: string;
  driverName?: string | null;
  licensePlate?: string | null;
  durationMinutes?: number;
  notes?: string | null;
  hasPendingChange?: boolean;
};

export async function getCalendarData(
  warehouseId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{ gates: CalendarGate[]; events: CalendarEvent[] }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, clientId, supplierId } = session.user;

  // Fetch gates for the warehouse
  const gates = await prisma.gates.findMany({
    where: { warehouseId, isActive: true },
    orderBy: { name: "asc" },
  });

  // Fetch reservations with confirmed version in the date range
  const reservations = await prisma.reservation.findMany({
    where: {
      gateId: { in: gates.map((g) => g.id) },
      status: { notIn: ["CANCELLED"] },
      confirmedVersion: {
        startTime: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      confirmedVersion: { include: { items: true } },
      pendingVersion: true,
      supplier: true,
      client: true,
    },
  });

  const events: CalendarEvent[] = [];

  for (const r of reservations) {
    const v = r.confirmedVersion;
    if (!v) continue;

    const endTime = new Date(v.startTime.getTime() + v.durationMinutes * 60 * 1000);

    let canSeeDetail = false;
    if (role === "ADMIN" || role === "WAREHOUSE_WORKER") canSeeDetail = true;
    else if (role === "CLIENT" && clientId === r.clientId) canSeeDetail = true;
    else if (role === "SUPPLIER" && supplierId === r.supplierId) canSeeDetail = true;

    const hasPendingChange = r.pendingVersionId !== null && r.pendingVersionId !== r.confirmedVersionId;

    events.push({
      id: r.id,
      resourceId: r.gateId,
      start: v.startTime.toISOString(),
      end: endTime.toISOString(),
      status: r.status,
      isOwn: canSeeDetail,
      title: canSeeDetail ? r.supplier.name : "",
      supplierName: canSeeDetail ? r.supplier.name : undefined,
      clientName: canSeeDetail ? r.client.name : undefined,
      vehicleType: canSeeDetail ? v.vehicleType : undefined,
      driverName: canSeeDetail ? v.driverName : undefined,
      licensePlate: canSeeDetail ? v.licensePlate : undefined,
      durationMinutes: canSeeDetail ? v.durationMinutes : undefined,
      notes: canSeeDetail ? v.notes : undefined,
      hasPendingChange,
    });
  }

  // Also add pending (not-yet-confirmed) reservations as lighter events
  const pendingReservations = await prisma.reservation.findMany({
    where: {
      gateId: { in: gates.map((g) => g.id) },
      status: "REQUESTED",
      confirmedVersionId: null,
      pendingVersion: {
        startTime: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      pendingVersion: true,
      supplier: true,
      client: true,
    },
  });

  pendingReservations.forEach((r) => {
      const v = r.pendingVersion;
      if (!v) return;
      const endTime = new Date(
        v.startTime.getTime() + v.durationMinutes * 60 * 1000
      );

      let canSeeDetail = false;
      if (role === "ADMIN" || role === "WAREHOUSE_WORKER") canSeeDetail = true;
      else if (role === "CLIENT" && clientId === r.clientId) canSeeDetail = true;
      else if (role === "SUPPLIER" && supplierId === r.supplierId) canSeeDetail = true;

      events.push({
        id: `pending-${r.id}`,
        resourceId: r.gateId,
        start: v.startTime.toISOString(),
        end: endTime.toISOString(),
        status: "REQUESTED",
        isOwn: canSeeDetail,
        title: canSeeDetail ? r.supplier.name : "",
        supplierName: canSeeDetail ? r.supplier.name : undefined,
        clientName: canSeeDetail ? r.client.name : undefined,
        durationMinutes: canSeeDetail ? v.durationMinutes : undefined,
        notes: canSeeDetail ? v.notes : undefined,
      });
    });

  return {
    gates: gates.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
    })),
    events,
  };
}

export async function getWarehouses() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, warehouseIds } = session.user;

  if (role === "WAREHOUSE_WORKER" && warehouseIds.length > 0) {
    return prisma.warehouse.findMany({
      where: { id: { in: warehouseIds }, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}
