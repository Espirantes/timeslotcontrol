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

import { isSlotFree, isGateOpen } from "@/lib/reservation-helpers";

describe("isSlotFree", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it("returns true when no conflicting reservation", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(true);
  });

  it("returns false when conflicting reservation overlaps", async () => {
    mockFindMany.mockResolvedValue([{
      startTime: new Date("2025-06-02T07:30:00Z"),
      durationMinutes: 90,
    }]);

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(false);
  });

  it("returns true when candidate ends before slot starts", async () => {
    mockFindMany.mockResolvedValue([{
      startTime: new Date("2025-06-02T06:00:00Z"),
      durationMinutes: 60, // ends at 07:00, before slot start 08:00
    }]);

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(true);
  });

  it("returns true when candidate ends exactly at slot start", async () => {
    mockFindMany.mockResolvedValue([{
      startTime: new Date("2025-06-02T07:00:00Z"),
      durationMinutes: 60, // ends exactly at 08:00
    }]);

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(true);
  });

  it("passes excludeReservationId to query", async () => {
    mockFindMany.mockResolvedValue([]);

    await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z"),
      "exclude-res-1"
    );

    const queryArg = mockFindMany.mock.calls[0][0];
    expect(queryArg.where.confirmedByReservation.id.not).toBe("exclude-res-1");
  });
});

describe("isGateOpen", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("returns false when no opening hours found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isGateOpen(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(false);
  });

  it("returns false when gate is closed on that day", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: false, openTime: "06:00", closeTime: "18:00" });

    const result = await isGateOpen(
      "gate-01",
      new Date("2025-06-01T08:00:00Z"),
      new Date("2025-06-01T09:00:00Z")
    );

    expect(result).toBe(false);
  });

  it("returns true when slot fits within opening hours", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    const start = new Date(2025, 5, 2, 8, 0, 0);
    const end = new Date(2025, 5, 2, 9, 0, 0);

    const result = await isGateOpen("gate-01", start, end);
    expect(result).toBe(true);
  });

  it("returns false when slot extends beyond closing time", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    const start = new Date(2025, 5, 2, 17, 30, 0);
    const end = new Date(2025, 5, 2, 18, 30, 0);

    const result = await isGateOpen("gate-01", start, end);
    expect(result).toBe(false);
  });

  it("returns false when slot starts before opening time", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    const start = new Date(2025, 5, 2, 5, 30, 0);
    const end = new Date(2025, 5, 2, 6, 30, 0);

    const result = await isGateOpen("gate-01", start, end);
    expect(result).toBe(false);
  });

  it("returns true when slot exactly matches opening hours", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "08:00", closeTime: "16:00" });

    const start = new Date(2025, 5, 2, 8, 0, 0);
    const end = new Date(2025, 5, 2, 16, 0, 0);

    const result = await isGateOpen("gate-01", start, end);
    expect(result).toBe(true);
  });

  it("queries correct day of week", async () => {
    mockFindUnique.mockResolvedValue(null);

    // Monday = day 1
    const monday = new Date(2025, 5, 2, 10, 0, 0); // June 2 2025 is Monday
    await isGateOpen("gate-01", monday, new Date(2025, 5, 2, 11, 0, 0));

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { gateId_dayOfWeek: { gateId: "gate-01", dayOfWeek: monday.getDay() } },
    });
  });
});
