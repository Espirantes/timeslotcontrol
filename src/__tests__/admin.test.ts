import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindMany = vi.fn();
const mockTransaction = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    warehouse: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    transportUnit: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    gates: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    gateOpeningHours: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", role: "ADMIN", warehouseIds: [], clientId: null, supplierId: null },
};

const workerSession = {
  user: { id: "worker-1", email: "worker@test.com", role: "WAREHOUSE_WORKER", warehouseIds: ["wh-1"], clientId: null, supplierId: null },
};

describe("getWarehouses", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("calls findMany with select (no password, no timestamps)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getWarehouses } = await import("@/lib/actions/admin");
    await getWarehouses();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select.id).toBe(true);
    expect(query.select.name).toBe(true);
    expect(query.select.createdAt).toBeUndefined();
    expect(query.select.updatedAt).toBeUndefined();
  });

  it("throws when user is not admin", async () => {
    mockAuth.mockResolvedValue(workerSession);

    const { getWarehouses } = await import("@/lib/actions/admin");
    await expect(getWarehouses()).rejects.toThrow("Admin only");
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { getWarehouses } = await import("@/lib/actions/admin");
    await expect(getWarehouses()).rejects.toThrow("Unauthorized");
  });
});

describe("getUsers", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("uses select that excludes password field", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getUsers } = await import("@/lib/actions/admin");
    await getUsers();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select.password).toBeUndefined();
    expect(query.select.id).toBe(true);
    expect(query.select.email).toBe(true);
    expect(query.select.name).toBe(true);
    expect(query.select.role).toBe(true);
  });

  it("includes warehouse and client/supplier relations", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getUsers } = await import("@/lib/actions/admin");
    await getUsers();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select.warehouses).toBeDefined();
    expect(query.select.client).toBeDefined();
    expect(query.select.supplier).toBeDefined();
  });
});

describe("getTransportUnits", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("uses select without createdAt/updatedAt", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getTransportUnits } = await import("@/lib/actions/admin");
    await getTransportUnits();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select.createdAt).toBeUndefined();
    expect(query.select.updatedAt).toBeUndefined();
  });
});

describe("updateGateOpeningHours", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockTransaction.mockReset();
    mockUpsert.mockReset();
  });

  it("uses $transaction for batch upsert", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockTransaction.mockResolvedValue([]);

    const { updateGateOpeningHours } = await import("@/lib/actions/admin");
    await updateGateOpeningHours("gate-1", [
      { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
    ]);

    expect(mockTransaction).toHaveBeenCalledOnce();
    // Should receive array of promises (one per day)
    const transactionArg = mockTransaction.mock.calls[0][0];
    expect(transactionArg).toHaveLength(2);
  });
});

describe("getGates", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("uses select to limit returned fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getGates } = await import("@/lib/actions/admin");
    await getGates();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select.createdAt).toBeUndefined();
    expect(query.select.updatedAt).toBeUndefined();
    expect(query.select.warehouse).toBeDefined();
    expect(query.select.openingHours).toBeDefined();
  });
});
