import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockCount = vi.fn();
const mockDeleteMany = vi.fn();
const mockCreateMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  cachedAuth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    warehouse: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    gates: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    gateOpeningHours: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    gateBlock: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    client: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    supplier: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    clientSupplier: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    userWarehouse: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
    transportUnit: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    auditLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ─── Sessions ─────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", role: "ADMIN", warehouseIds: [], clientId: null, supplierId: null, isVerified: true },
};
const workerSession = {
  user: { id: "worker-1", email: "worker@test.com", role: "WAREHOUSE_WORKER", warehouseIds: ["wh-1"], clientId: null, supplierId: null, isVerified: true },
};
const clientSession = {
  user: { id: "client-1", email: "client@test.com", role: "CLIENT", warehouseIds: [], clientId: "client-01", supplierId: null, isVerified: true },
};

function resetAll() {
  mockAuth.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockFindMany.mockReset();
  mockFindUnique.mockReset();
  mockFindUniqueOrThrow.mockReset();
  mockCount.mockReset();
  mockDeleteMany.mockReset();
  mockCreateMany.mockReset();
  mockUpdateMany.mockReset();
  mockTransaction.mockReset();
  mockUpsert.mockReset();
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

describe("getWarehouses", () => {
  beforeEach(resetAll);

  it("calls findMany with select (no timestamps)", async () => {
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

  it("filters out soft-deleted warehouses", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getWarehouses } = await import("@/lib/actions/admin");
    await getWarehouses();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.where).toEqual({ deletedAt: null });
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

describe("createWarehouse", () => {
  beforeEach(resetAll);

  it("creates warehouse with valid data", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "wh-01", name: "Sklad A" });

    const { createWarehouse } = await import("@/lib/actions/admin");
    const result = await createWarehouse({ name: "Sklad A" });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ id: "wh-01", name: "Sklad A" });
  });

  it("passes name to prisma create", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "wh-02", name: "Sklad B" });

    const { createWarehouse } = await import("@/lib/actions/admin");
    await createWarehouse({ name: "Sklad B", address: "Ulice 1", country: "CZ" });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.name).toBe("Sklad B");
    expect(data.address).toBe("Ulice 1");
    expect(data.country).toBe("CZ");
  });

  it("throws ZodError when name is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createWarehouse } = await import("@/lib/actions/admin");
    await expect(createWarehouse({ name: "" })).rejects.toThrow();
  });

  it("throws ZodError when name exceeds 100 chars", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createWarehouse } = await import("@/lib/actions/admin");
    await expect(createWarehouse({ name: "x".repeat(101) })).rejects.toThrow();
  });

  it("throws when not admin", async () => {
    mockAuth.mockResolvedValue(workerSession);

    const { createWarehouse } = await import("@/lib/actions/admin");
    await expect(createWarehouse({ name: "Sklad" })).rejects.toThrow("Admin only");
  });
});

describe("deleteWarehouse", () => {
  beforeEach(resetAll);

  it("soft-deletes: calls update with deletedAt, not prisma.delete", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Sklad A", address: null });
    mockUpdate.mockResolvedValue({});

    const { deleteWarehouse } = await import("@/lib/actions/admin");
    await deleteWarehouse("wh-01");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArg.where.id).toBe("wh-01");
  });

  it("throws when not admin", async () => {
    mockAuth.mockResolvedValue(workerSession);

    const { deleteWarehouse } = await import("@/lib/actions/admin");
    await expect(deleteWarehouse("wh-01")).rejects.toThrow("Admin only");
  });
});

// ─── Gates ────────────────────────────────────────────────────────────────────

describe("getGates", () => {
  beforeEach(resetAll);

  it("uses select with warehouse and openingHours", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getGates } = await import("@/lib/actions/admin");
    await getGates();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select.warehouse).toBeDefined();
    expect(query.select.openingHours).toBeDefined();
    expect(query.select.createdAt).toBeUndefined();
    expect(query.select.updatedAt).toBeUndefined();
  });

  it("filters out soft-deleted gates", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getGates } = await import("@/lib/actions/admin");
    await getGates();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.where).toEqual({ deletedAt: null });
  });
});

describe("createGate", () => {
  beforeEach(resetAll);

  it("creates gate with warehouseId and name", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "gate-02", name: "Rampa 2", warehouseId: "wh-01" });

    const { createGate } = await import("@/lib/actions/admin");
    const result = await createGate({ warehouseId: "wh-01", name: "Rampa 2" });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("gate-02");
  });

  it("accepts non-CUID IDs like 'wh-01'", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "gate-01", name: "Rampa 1", warehouseId: "wh-01" });

    const { createGate } = await import("@/lib/actions/admin");
    // Should NOT throw — seed uses IDs like wh-01, gate-01
    await expect(createGate({ warehouseId: "wh-01", name: "Rampa 1" })).resolves.toBeDefined();
  });

  it("throws ZodError when name is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createGate } = await import("@/lib/actions/admin");
    await expect(createGate({ warehouseId: "wh-01", name: "" })).rejects.toThrow();
  });

  it("throws ZodError when warehouseId is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createGate } = await import("@/lib/actions/admin");
    await expect(createGate({ warehouseId: "", name: "Rampa" })).rejects.toThrow();
  });
});

describe("deleteGate", () => {
  beforeEach(resetAll);

  it("soft-deletes gate via update with deletedAt", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Rampa 1", warehouseId: "wh-01" });
    mockUpdate.mockResolvedValue({});

    const { deleteGate } = await import("@/lib/actions/admin");
    await deleteGate("gate-01");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("updateGateOpeningHours", () => {
  beforeEach(resetAll);

  it("uses $transaction for batch upsert", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockTransaction.mockResolvedValue([]);

    const { updateGateOpeningHours } = await import("@/lib/actions/admin");
    await updateGateOpeningHours("gate-01", [
      { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
    ]);

    expect(mockTransaction).toHaveBeenCalledOnce();
    const transactionArg = mockTransaction.mock.calls[0][0];
    expect(transactionArg).toHaveLength(2);
  });

  it("throws when not admin", async () => {
    mockAuth.mockResolvedValue(workerSession);

    const { updateGateOpeningHours } = await import("@/lib/actions/admin");
    await expect(updateGateOpeningHours("gate-01", [])).rejects.toThrow("Admin only");
  });

  it("throws ZodError for invalid openTime format", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { updateGateOpeningHours } = await import("@/lib/actions/admin");
    await expect(
      updateGateOpeningHours("gate-01", [{ dayOfWeek: 1, openTime: "0800", closeTime: "18:00", isOpen: true }])
    ).rejects.toThrow();
  });
});

// ─── Gate Blocks ──────────────────────────────────────────────────────────────

describe("createGateBlock", () => {
  beforeEach(resetAll);

  const validBlock = {
    gateId: "gate-01",
    startTime: "2025-06-09T10:00:00.000Z",
    endTime: "2025-06-09T12:00:00.000Z",
    reason: "Údržba",
  };

  it("admin can create gate block", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "block-1", ...validBlock });

    const { createGateBlock } = await import("@/lib/actions/admin");
    const result = await createGateBlock(validBlock);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("block-1");
  });

  it("warehouse worker can also create gate block", async () => {
    mockAuth.mockResolvedValue(workerSession);
    mockCreate.mockResolvedValue({ id: "block-2", ...validBlock });

    const { createGateBlock } = await import("@/lib/actions/admin");
    await expect(createGateBlock(validBlock)).resolves.toBeDefined();
  });

  it("client cannot create gate block", async () => {
    mockAuth.mockResolvedValue(clientSession);

    const { createGateBlock } = await import("@/lib/actions/admin");
    await expect(createGateBlock(validBlock)).rejects.toThrow("Admin or worker only");
  });

  it("throws ZodError when reason is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createGateBlock } = await import("@/lib/actions/admin");
    await expect(createGateBlock({ ...validBlock, reason: "" })).rejects.toThrow();
  });
});

describe("deleteGateBlock", () => {
  beforeEach(resetAll);

  it("deletes block (hard delete)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDelete.mockResolvedValue({});

    const { deleteGateBlock } = await import("@/lib/actions/admin");
    await deleteGateBlock("block-1");

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDelete.mock.calls[0][0]).toEqual({ where: { id: "block-1" } });
  });

  it("worker can delete block", async () => {
    mockAuth.mockResolvedValue(workerSession);
    mockDelete.mockResolvedValue({});

    const { deleteGateBlock } = await import("@/lib/actions/admin");
    await expect(deleteGateBlock("block-1")).resolves.toBeUndefined();
  });
});

// ─── Clients ──────────────────────────────────────────────────────────────────

describe("createClient", () => {
  beforeEach(resetAll);

  it("creates client with name", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "client-01", name: "Allegro" });

    const { createClient } = await import("@/lib/actions/admin");
    const result = await createClient({ name: "Allegro" });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("client-01");
  });

  it("transforms empty email to null", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "client-02", name: "Test", contactEmail: null });

    const { createClient } = await import("@/lib/actions/admin");
    await createClient({ name: "Test", contactEmail: "" });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.contactEmail).toBeNull();
  });

  it("throws ZodError for invalid email", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createClient } = await import("@/lib/actions/admin");
    await expect(createClient({ name: "Test", contactEmail: "not-an-email" })).rejects.toThrow();
  });

  it("throws ZodError for empty name", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createClient } = await import("@/lib/actions/admin");
    await expect(createClient({ name: "" })).rejects.toThrow();
  });
});

describe("deleteClient", () => {
  beforeEach(resetAll);

  it("soft-deletes client via update with deletedAt", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Allegro", contactEmail: null });
    mockUpdate.mockResolvedValue({});

    const { deleteClient } = await import("@/lib/actions/admin");
    await deleteClient("client-01");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArg.where.id).toBe("client-01");
  });
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

describe("createSupplier", () => {
  beforeEach(resetAll);

  it("creates supplier without clientIds", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "sup-01", name: "Procter & Gamble" });

    const { createSupplier } = await import("@/lib/actions/admin");
    const result = await createSupplier({ name: "Procter & Gamble" });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("sup-01");
  });

  it("creates supplier with clientIds embedded", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "sup-02", name: "Dodavatel A" });

    const { createSupplier } = await import("@/lib/actions/admin");
    await createSupplier({ name: "Dodavatel A", clientIds: ["client-01"] });

    const createData = mockCreate.mock.calls[0][0].data;
    expect(createData.clients).toBeDefined();
  });

  it("throws ZodError for empty name", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createSupplier } = await import("@/lib/actions/admin");
    await expect(createSupplier({ name: "" })).rejects.toThrow();
  });
});

describe("updateSupplier", () => {
  beforeEach(resetAll);

  it("replaces clientIds with deleteMany + createMany", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Old Name" });
    mockUpdate.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({});
    mockCreateMany.mockResolvedValue({});

    const { updateSupplier } = await import("@/lib/actions/admin");
    await updateSupplier("sup-01", { name: "New Name", clientIds: ["client-01", "client-02"] });

    expect(mockDeleteMany).toHaveBeenCalledOnce();
    expect(mockCreateMany).toHaveBeenCalledOnce();

    const createManyData = mockCreateMany.mock.calls[0][0].data;
    expect(createManyData).toHaveLength(2);
    expect(createManyData[0].supplierId).toBe("sup-01");
  });

  it("skips clientId sync when clientIds not provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Supplier" });
    mockUpdate.mockResolvedValue({});

    const { updateSupplier } = await import("@/lib/actions/admin");
    await updateSupplier("sup-01", { name: "New Name" });

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});

describe("deleteSupplier", () => {
  beforeEach(resetAll);

  it("soft-deletes supplier via update with deletedAt", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Supplier A", contactEmail: null });
    mockUpdate.mockResolvedValue({});

    const { deleteSupplier } = await import("@/lib/actions/admin");
    await deleteSupplier("sup-01");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe("getUsers", () => {
  beforeEach(resetAll);

  it("select does not include password", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getUsers } = await import("@/lib/actions/admin");
    await getUsers();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select.password).toBeUndefined();
    expect(query.select.id).toBe(true);
    expect(query.select.email).toBe(true);
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

describe("createUser", () => {
  beforeEach(resetAll);

  const baseUser = {
    email: "new@test.com",
    name: "New User",
    password: "password123",
    role: "ADMIN" as const,
  };

  it("response does not include password hash", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "user-1", email: "new@test.com", name: "New User", role: "ADMIN", password: "hashed_password" });

    const { createUser } = await import("@/lib/actions/admin");
    const result = await createUser(baseUser);

    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it("stores hashed password (not plain text)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "user-1", email: "new@test.com", name: "New User", role: "ADMIN", password: "hashed_password" });

    const { createUser } = await import("@/lib/actions/admin");
    await createUser(baseUser);

    const createData = mockCreate.mock.calls[0][0].data;
    expect(createData.password).not.toBe("password123");
    expect(createData.password).toBe("hashed_password");
  });

  it("throws ZodError for password shorter than 8 chars", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createUser } = await import("@/lib/actions/admin");
    await expect(createUser({ ...baseUser, password: "short" })).rejects.toThrow();
  });

  it("throws ZodError for invalid email", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createUser } = await import("@/lib/actions/admin");
    await expect(createUser({ ...baseUser, email: "not-an-email" })).rejects.toThrow();
  });

  it("throws ZodError for invalid role", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createUser } = await import("@/lib/actions/admin");
    await expect(createUser({ ...baseUser, role: "SUPERUSER" as never })).rejects.toThrow();
  });
});

describe("deleteUser", () => {
  beforeEach(resetAll);

  it("deactivates user (isActive=false) — NOT hard delete", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockUpdate.mockResolvedValue({});

    const { deleteUser } = await import("@/lib/actions/admin");
    await deleteUser("user-1");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].data).toEqual({ isActive: false });
    expect(mockUpdate.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });
});

// ─── Transport Units ──────────────────────────────────────────────────────────

describe("getTransportUnits", () => {
  beforeEach(resetAll);

  it("uses select without timestamps", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);

    const { getTransportUnits } = await import("@/lib/actions/admin");
    await getTransportUnits();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.select.createdAt).toBeUndefined();
    expect(query.select.updatedAt).toBeUndefined();
    expect(query.select.id).toBe(true);
    expect(query.select.name).toBe(true);
  });
});

describe("createTransportUnit", () => {
  beforeEach(resetAll);

  it("creates transport unit with valid data", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "tu-01", name: "EUR paleta", weightKg: 20, processingMinutes: 15 });

    const { createTransportUnit } = await import("@/lib/actions/admin");
    const result = await createTransportUnit({ name: "EUR paleta", weightKg: 20, processingMinutes: 15 });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.id).toBe("tu-01");
  });

  it("throws ZodError when processingMinutes is not integer", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createTransportUnit } = await import("@/lib/actions/admin");
    await expect(createTransportUnit({ name: "Paleta", weightKg: 20, processingMinutes: 1.5 })).rejects.toThrow();
  });

  it("throws ZodError when weightKg is negative", async () => {
    mockAuth.mockResolvedValue(adminSession);

    const { createTransportUnit } = await import("@/lib/actions/admin");
    await expect(createTransportUnit({ name: "Paleta", weightKg: -1, processingMinutes: 15 })).rejects.toThrow();
  });
});

describe("deleteTransportUnit", () => {
  beforeEach(resetAll);

  it("soft-deletes: sets isActive=false, does not hard-delete", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUniqueOrThrow.mockResolvedValue({ name: "Paleta" });
    mockUpdate.mockResolvedValue({});

    const { deleteTransportUnit } = await import("@/lib/actions/admin");
    await deleteTransportUnit("tu-01");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].data).toEqual({ isActive: false });
  });
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

describe("getAuditLogs", () => {
  beforeEach(resetAll);

  it("returns items with formatted createdAt string", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const createdAt = new Date("2025-06-09T10:00:00.000Z");
    mockFindMany.mockResolvedValue([{
      id: "log-1",
      entityType: "warehouse",
      entityId: "wh-01",
      action: "created",
      oldData: null,
      newData: { name: "Sklad A" },
      user: { name: "Admin", email: "admin@test.com" },
      createdAt,
    }]);
    mockCount.mockResolvedValue(1);

    const { getAuditLogs } = await import("@/lib/actions/admin");
    const result = await getAuditLogs();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].createdAt).toBe(createdAt.toISOString());
    expect(result.total).toBe(1);
  });

  it("filters by entityType when provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const { getAuditLogs } = await import("@/lib/actions/admin");
    await getAuditLogs({ entityType: "warehouse" });

    const query = mockFindMany.mock.calls[0][0];
    expect(query.where).toEqual({ entityType: "warehouse" });
  });

  it("uses no where filter when entityType is not provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const { getAuditLogs } = await import("@/lib/actions/admin");
    await getAuditLogs();

    const query = mockFindMany.mock.calls[0][0];
    expect(query.where).toEqual({});
  });
});
