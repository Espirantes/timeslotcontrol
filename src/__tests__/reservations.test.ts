import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reservationVersion: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    gateOpeningHours: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Mock next-auth so "use server" import doesn't break
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { isSlotFree, isGateOpen } from "@/lib/actions/reservations";

describe("isSlotFree", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
  });

  it("returns true when no conflicting reservation", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(true);
  });

  it("returns false when conflicting reservation overlaps", async () => {
    mockFindFirst.mockResolvedValue({
      startTime: new Date("2025-06-02T07:30:00Z"),
      durationMinutes: 90, // ends at 09:00
    });

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(false);
  });

  it("returns true when conflicting reservation ends before slot starts", async () => {
    mockFindFirst.mockResolvedValue({
      startTime: new Date("2025-06-02T06:00:00Z"),
      durationMinutes: 60, // ends at 07:00
    });

    const result = await isSlotFree(
      "gate-01",
      new Date("2025-06-02T08:00:00Z"),
      new Date("2025-06-02T09:00:00Z")
    );

    expect(result).toBe(true);
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
      new Date("2025-06-01T08:00:00Z"), // Sunday
      new Date("2025-06-01T09:00:00Z")
    );

    expect(result).toBe(false);
  });

  it("returns true when slot fits within opening hours", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    // Use local times to avoid timezone issues — create dates where local hours are 08:00-09:00
    const start = new Date(2025, 5, 2, 8, 0, 0); // June 2, 08:00 local
    const end = new Date(2025, 5, 2, 9, 0, 0);   // June 2, 09:00 local

    const result = await isGateOpen("gate-01", start, end);

    expect(result).toBe(true);
  });

  it("returns false when slot extends beyond closing time", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    const start = new Date(2025, 5, 2, 17, 30, 0); // 17:30 local
    const end = new Date(2025, 5, 2, 18, 30, 0);   // 18:30 local

    const result = await isGateOpen("gate-01", start, end);

    expect(result).toBe(false);
  });

  it("returns false when slot starts before opening time", async () => {
    mockFindUnique.mockResolvedValue({ isOpen: true, openTime: "06:00", closeTime: "18:00" });

    const start = new Date(2025, 5, 2, 5, 30, 0); // 05:30 local
    const end = new Date(2025, 5, 2, 6, 30, 0);   // 06:30 local

    const result = await isGateOpen("gate-01", start, end);

    expect(result).toBe(false);
  });
});
