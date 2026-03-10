import { prisma } from "@/lib/prisma";

/** Check if a gate slot is free (no confirmed reservation overlapping).
 *  Uses findMany with proper two-sided overlap condition to avoid
 *  the findFirst single-row bug (C1). */
export async function isSlotFree(
  gateId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string,
) {
  // Fetch ALL versions that start before the requested end time
  const candidates = await prisma.reservationVersion.findMany({
    where: {
      confirmedByReservation: {
        gateId,
        status: { in: ["CONFIRMED", "UNLOADING_STARTED"] },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      startTime: { lt: endTime },
    },
    select: { startTime: true, durationMinutes: true },
  });

  // Check the second half of the overlap condition in JS
  return !candidates.some((c) => {
    const conflEnd = new Date(c.startTime.getTime() + c.durationMinutes * 60 * 1000);
    return conflEnd > startTime;
  });
}

/** Check if gate is open at the given time */
export async function isGateOpen(gateId: string, startTime: Date, endTime: Date) {
  const dayOfWeek = startTime.getDay();
  const hours = await prisma.gateOpeningHours.findUnique({
    where: { gateId_dayOfWeek: { gateId, dayOfWeek } },
  });

  if (!hours || !hours.isOpen) return false;

  const [openH, openM] = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  const gateOpen = new Date(startTime);
  gateOpen.setHours(openH, openM, 0, 0);
  const gateClose = new Date(startTime);
  gateClose.setHours(closeH, closeM, 0, 0);

  return startTime >= gateOpen && endTime <= gateClose;
}
