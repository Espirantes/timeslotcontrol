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
  reservationType?: string;
  isRecurring?: boolean;
};

export type CalendarHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
};

export type CalendarBlock = {
  id: string;
  gateId: string;
  start: string;
  end: string;
  reason: string;
};

export async function getCalendarData(
  warehouseId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{ gates: CalendarGate[]; events: CalendarEvent[]; holidays: CalendarHoliday[]; blocks: CalendarBlock[] }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, clientId, supplierId } = session.user;

  // Fetch gates for the warehouse
  const gates = await prisma.gates.findMany({
    where: { warehouseId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
      reservationType: canSeeDetail ? r.type : undefined,
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
        reservationType: canSeeDetail ? r.type : undefined,
      });
    });

  // Fetch holidays for this warehouse's country
  let holidays: CalendarHoliday[] = [];
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { country: true },
  });
  if (warehouse?.country) {
    const { getHolidaysForMonth } = await import("@/lib/holidays");
    // Collect holidays for all months in the date range
    const seen = new Set<string>();
    const d = new Date(dateFrom);
    while (d <= dateTo) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        const monthHolidays = getHolidaysForMonth(warehouse.country, d.getFullYear(), d.getMonth());
        for (const h of monthHolidays) {
          if (h.date >= dateFrom.toISOString().slice(0, 10) && h.date <= dateTo.toISOString().slice(0, 10)) {
            holidays.push(h);
          }
        }
      }
      d.setMonth(d.getMonth() + 1);
    }
  }

  // Lazy-generate recurring reservation instances for the viewed date range
  const activeRecurring = await prisma.recurringReservation.findMany({
    where: {
      gateId: { in: gates.map((g) => g.id) },
      isActive: true,
      startDate: { lte: dateTo },
      OR: [{ endDate: null }, { endDate: { gte: dateFrom } }],
    },
  });

  let didGenerate = false;
  if (activeRecurring.length > 0) {
    const { generateInstances } = await import("@/lib/actions/recurring-reservations");
    for (const rr of activeRecurring) {
      if (!rr.lastGeneratedDate || rr.lastGeneratedDate < dateTo) {
        try {
          const result = await generateInstances(rr.id, dateTo);
          if (result.created > 0) didGenerate = true;
        } catch (err) {
          console.error(`[lazy-gen] Failed for recurring ${rr.id}:`, err);
        }
      }
    }
  }

  // Re-fetch confirmed reservations if any were generated
  if (didGenerate) {
    const newReservations = await prisma.reservation.findMany({
      where: {
        gateId: { in: gates.map((g) => g.id) },
        status: { notIn: ["CANCELLED"] },
        recurringReservationId: { not: null },
        confirmedVersion: { startTime: { gte: dateFrom, lte: dateTo } },
        id: { notIn: reservations.map((r) => r.id) },
      },
      include: {
        confirmedVersion: { include: { items: true } },
        pendingVersion: true,
        supplier: true,
        client: true,
      },
    });
    for (const r of newReservations) {
      const v = r.confirmedVersion;
      if (!v) continue;
      const endTime = new Date(v.startTime.getTime() + v.durationMinutes * 60 * 1000);
      let canSeeDetail = false;
      if (role === "ADMIN" || role === "WAREHOUSE_WORKER") canSeeDetail = true;
      else if (role === "CLIENT" && clientId === r.clientId) canSeeDetail = true;
      else if (role === "SUPPLIER" && supplierId === r.supplierId) canSeeDetail = true;
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
        hasPendingChange: false,
        reservationType: canSeeDetail ? r.type : undefined,
        isRecurring: true,
      });
    }
  }

  // Mark existing recurring events
  const recurringIds = new Set(
    reservations.filter((r) => r.recurringReservationId).map((r) => r.id)
  );
  for (const ev of events) {
    if (recurringIds.has(ev.id)) ev.isRecurring = true;
  }

  // Fetch gate blocks in the date range
  const gateBlocks = await prisma.gateBlock.findMany({
    where: {
      gateId: { in: gates.map((g) => g.id) },
      startTime: { lt: dateTo },
      endTime: { gt: dateFrom },
    },
    orderBy: { startTime: "asc" },
  });

  return {
    gates: gates.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
    })),
    events,
    holidays,
    blocks: gateBlocks.map((b) => ({
      id: b.id,
      gateId: b.gateId,
      start: b.startTime.toISOString(),
      end: b.endTime.toISOString(),
      reason: b.reason,
    })),
  };
}

export async function getWarehouses() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { role, warehouseIds, clientId, supplierId } = session.user;

  // C4: Fail closed — scoped roles with missing scope values must not fall through
  if (role === "WAREHOUSE_WORKER" && warehouseIds.length === 0) throw new Error("INVALID_SESSION");
  if (role === "CLIENT" && !clientId) throw new Error("INVALID_SESSION");
  if (role === "SUPPLIER" && !supplierId) throw new Error("INVALID_SESSION");

  if (role === "WAREHOUSE_WORKER") {
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
