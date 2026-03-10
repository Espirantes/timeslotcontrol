import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservationVersion: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    gateOpeningHours: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Helper: build a Date for a given HH:MM on 2025-06-09 (Monday = dayOfWeek 1)
function monday(hh: number, mm = 0) {
  return new Date(2025, 5, 9, hh, mm, 0, 0); // June 9 2025, local time
}

describe("isSlotFree", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it("returns true when there are no conflicting reservations", async () => {
    mockFindMany.mockResolvedValue([]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    const result = await isSlotFree("gate-1", monday(10), monday(11));

    expect(result).toBe(true);
  });

  it("returns false when an existing reservation overlaps the requested slot", async () => {
    // Existing: 09:30–10:30 — overlaps with requested 10:00–11:00
    mockFindMany.mockResolvedValue([
      { startTime: monday(9, 30), durationMinutes: 60 },
    ]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    const result = await isSlotFree("gate-1", monday(10), monday(11));

    expect(result).toBe(false);
  });

  it("returns true when existing reservation ends exactly at the start of the new slot", async () => {
    // Existing: 09:00–10:00, requested: 10:00–11:00 → adjacent, not overlapping
    mockFindMany.mockResolvedValue([
      { startTime: monday(9), durationMinutes: 60 },
    ]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    const result = await isSlotFree("gate-1", monday(10), monday(11));

    expect(result).toBe(true);
  });

  it("returns false when an existing reservation fully contains the requested slot", async () => {
    // Existing: 09:00–12:00, requested: 10:00–11:00
    mockFindMany.mockResolvedValue([
      { startTime: monday(9), durationMinutes: 180 },
    ]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    const result = await isSlotFree("gate-1", monday(10), monday(11));

    expect(result).toBe(false);
  });

  it("passes excludeReservationId to the query filter", async () => {
    mockFindMany.mockResolvedValue([]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    await isSlotFree("gate-1", monday(10), monday(11), "res-exclude");

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.confirmedByReservation.id).toEqual({ not: "res-exclude" });
  });

  it("does NOT pass id filter when excludeReservationId is omitted", async () => {
    mockFindMany.mockResolvedValue([]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    await isSlotFree("gate-1", monday(10), monday(11));

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.confirmedByReservation.id).toBeUndefined();
  });

  it("queries only CONFIRMED and UNLOADING_STARTED statuses", async () => {
    mockFindMany.mockResolvedValue([]);

    const { isSlotFree } = await import("@/lib/reservation-helpers");
    await isSlotFree("gate-1", monday(10), monday(11));

    const status = mockFindMany.mock.calls[0][0].where.confirmedByReservation.status;
    expect(status.in).toEqual(["CONFIRMED", "UNLOADING_STARTED"]);
  });

  it("uses startTime: { lt: endTime } for the DB query (overnight-safe)", async () => {
    mockFindMany.mockResolvedValue([]);

    const end = monday(11);
    const { isSlotFree } = await import("@/lib/reservation-helpers");
    await isSlotFree("gate-1", monday(10), end);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.startTime).toEqual({ lt: end });
  });
});

describe("isGateOpen", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("returns false when no opening hours record exists for the day", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    const result = await isGateOpen("gate-1", monday(10), monday(11));

    expect(result).toBe(false);
  });

  it("returns false when isOpen is false on the record", async () => {
    mockFindUnique.mockResolvedValue({
      isOpen: false,
      openTime: "08:00",
      closeTime: "18:00",
    });

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    const result = await isGateOpen("gate-1", monday(10), monday(11));

    expect(result).toBe(false);
  });

  it("returns true when the slot fits within opening hours", async () => {
    mockFindUnique.mockResolvedValue({
      isOpen: true,
      openTime: "08:00",
      closeTime: "18:00",
    });

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    const result = await isGateOpen("gate-1", monday(10), monday(11));

    expect(result).toBe(true);
  });

  it("returns false when start is before opening time", async () => {
    mockFindUnique.mockResolvedValue({
      isOpen: true,
      openTime: "10:00",
      closeTime: "18:00",
    });

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    // 09:00–10:00 starts before 10:00 open
    const result = await isGateOpen("gate-1", monday(9), monday(10));

    expect(result).toBe(false);
  });

  it("returns false when end is after closing time", async () => {
    mockFindUnique.mockResolvedValue({
      isOpen: true,
      openTime: "08:00",
      closeTime: "17:00",
    });

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    // 16:00–18:00 ends after 17:00 close
    const result = await isGateOpen("gate-1", monday(16), monday(18));

    expect(result).toBe(false);
  });

  it("returns true for a slot that starts exactly at open and ends at close", async () => {
    mockFindUnique.mockResolvedValue({
      isOpen: true,
      openTime: "08:00",
      closeTime: "18:00",
    });

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    const result = await isGateOpen("gate-1", monday(8), monday(18));

    expect(result).toBe(true);
  });

  it("queries by correct gateId and dayOfWeek (1 = Monday)", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { isGateOpen } = await import("@/lib/reservation-helpers");
    await isGateOpen("gate-abc", monday(10), monday(11));

    const where = mockFindUnique.mock.calls[0][0].where;
    expect(where.gateId_dayOfWeek).toEqual({ gateId: "gate-abc", dayOfWeek: 1 });
  });
});
