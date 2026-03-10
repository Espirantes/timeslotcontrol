import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  cachedAuth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() })); // no-op: skip post-request side effects
vi.mock("@/lib/audit", () => ({ auditLog: vi.fn() }));
vi.mock("@/lib/email", () => ({
  notifyReservationCreated: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/actions/notifications", () => ({
  createReservationNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    clientSupplier: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    gates: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    gateOpeningHours: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    holiday: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    gateBlock: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    reservationVersion: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    reservation: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ─── Sessions ─────────────────────────────────────────────────────────────────

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    role: "ADMIN",
    warehouseIds: [],
    clientId: null,
    supplierId: null,
    isVerified: true,
  },
};

const clientSession = {
  user: {
    id: "client-user-1",
    email: "client@test.com",
    role: "CLIENT",
    warehouseIds: [],
    clientId: "client-01",
    supplierId: null,
    isVerified: true,
  },
};

const supplierSession = {
  user: {
    id: "supplier-user-1",
    email: "supplier@test.com",
    role: "SUPPLIER",
    warehouseIds: [],
    clientId: null,
    supplierId: "sup-01",
    isVerified: true,
  },
};

const unverifiedSession = {
  user: {
    id: "user-1",
    email: "user@test.com",
    role: "SUPPLIER",
    warehouseIds: [],
    clientId: null,
    supplierId: "sup-01",
    isVerified: false,
  },
};

// ─── Valid base input ─────────────────────────────────────────────────────────

const validInput = {
  gateId: "gate-01",
  clientId: "client-01",
  startTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  durationMinutes: 60,
  vehicleType: "TRUCK" as const,
  items: [{ transportUnitId: "tu-01", quantity: 1 }],
};

function resetAll() {
  mockAuth.mockReset();
  mockFindFirst.mockReset();
  mockFindUnique.mockReset();
  mockFindUniqueOrThrow.mockReset();
  mockFindMany.mockReset();
  mockTransaction.mockReset();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("createReservation — auth guards", () => {
  beforeEach(resetAll);

  it("throws Unauthorized when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("Unauthorized");
  });

  it("throws when CLIENT role tries to create reservation", async () => {
    mockAuth.mockResolvedValue(clientSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("Clients cannot create reservations directly");
  });

  it("throws when account is not verified", async () => {
    mockAuth.mockResolvedValue(unverifiedSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("Account not verified");
  });
});

describe("createReservation — Zod validation", () => {
  beforeEach(resetAll);

  it("throws when vehicleType is invalid", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation({ ...validInput, vehicleType: "BICYCLE" as never })).rejects.toThrow();
  });

  it("throws when durationMinutes is not a multiple of 15", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation({ ...validInput, durationMinutes: 20 })).rejects.toThrow();
  });

  it("throws when items array is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation({ ...validInput, items: [] })).rejects.toThrow();
  });

  it("throws when gateId is empty string", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation({ ...validInput, gateId: "" })).rejects.toThrow();
  });

  it("accepts seed-style IDs (gate-01, client-01, tu-01)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    // Mock the supplier resolution for admin
    mockFindFirst.mockResolvedValue({ supplierId: "sup-01", clientId: "client-01" });
    // Mock isSlotFree: no conflicts
    mockFindMany.mockResolvedValue([]);
    // Mock transaction returning the created reservation
    mockTransaction.mockResolvedValue([
      { id: "res-01" },
      {},
    ]);

    const { createReservation } = await import("@/lib/actions/reservations");
    // Should not throw on Zod validation with seed-style IDs
    await expect(createReservation(validInput)).resolves.toBeDefined();
  });
});

describe("createReservation — supplier resolution", () => {
  beforeEach(resetAll);

  it("throws 'User has no supplier linked' when SUPPLIER session has no supplierId", async () => {
    const noSupplierSession = {
      user: { ...supplierSession.user, supplierId: null },
    };
    mockAuth.mockResolvedValue(noSupplierSession);

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("User has no supplier linked");
  });

  it("throws 'Supplier not linked to this client' when link not found", async () => {
    mockAuth.mockResolvedValue(supplierSession);
    // findUnique returns null = no client-supplier link
    mockFindUnique.mockResolvedValue(null);
    // Also mock findMany for holiday and gate block checks (non-admin path)
    mockFindMany.mockResolvedValue([]);
    // Mock isGateOpen (findUnique for gateOpeningHours)
    // findUnique is already returning null above which will trigger "not open"
    // but supplier path checks isGateOpen which returns false → throws
    mockFindUniqueOrThrow.mockResolvedValue({ warehouse: { country: null } });

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("Supplier not linked to this client");
  });

  it("admin uses provided supplierId when given", async () => {
    mockAuth.mockResolvedValue(adminSession);
    // Should use the provided supplierId
    mockFindFirst.mockResolvedValue({ supplierId: "sup-01", clientId: "client-01" });
    mockFindMany.mockResolvedValue([]);
    mockTransaction.mockResolvedValue([{ id: "res-01" }, {}]);

    const { createReservation } = await import("@/lib/actions/reservations");
    await createReservation({ ...validInput, supplierId: "sup-01" });

    // findFirst should have been called with supplierId filter
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.supplierId).toBe("sup-01");
  });

  it("admin without supplierId falls back to first supplier of client", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindFirst.mockResolvedValue({ supplierId: "sup-01", clientId: "client-01" });
    mockFindMany.mockResolvedValue([]);
    mockTransaction.mockResolvedValue([{ id: "res-01" }, {}]);

    const { createReservation } = await import("@/lib/actions/reservations");
    await createReservation(validInput); // no supplierId provided

    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.supplierId).toBeUndefined(); // no supplierId filter = first of client
    expect(where.clientId).toBe("client-01");
  });

  it("admin throws 'No supplier found for client' when client has no suppliers", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindFirst.mockResolvedValue(null); // no supplier linked to client

    const { createReservation } = await import("@/lib/actions/reservations");
    await expect(createReservation(validInput)).rejects.toThrow("No supplier found for client");
  });
});
