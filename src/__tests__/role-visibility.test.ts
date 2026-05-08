// Risk-weighted role-visibility tests. These cover the highest-impact denial
// cases identified in docs/role-visibility-matrix.md: cross-tenant access
// (workers reaching into other warehouses), cross-role denial (non-admins
// invoking admin actions directly), and cross-instance denial (suppliers,
// clients, carriers fetching each other's reservation detail).

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockCount = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  cachedAuth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/audit", () => ({ auditLog: vi.fn() }));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/email", () => ({
  notifyNewRegistration: vi.fn().mockResolvedValue(undefined),
  notifyReservationCreated: vi.fn().mockResolvedValue(undefined),
  notifyReservationApproved: vi.fn().mockResolvedValue(undefined),
  notifyReservationRejected: vi.fn().mockResolvedValue(undefined),
  notifyStatusChanged: vi.fn().mockResolvedValue(undefined),
  notifyUserApproved: vi.fn().mockResolvedValue(undefined),
  notifyUserRejected: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications-server", () => ({
  createNotificationsForEvent: vi.fn().mockResolvedValue(undefined),
  createRegistrationNotification: vi.fn().mockResolvedValue(undefined),
  createUserApprovalNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    warehouse: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
    gates: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockFindUniqueOrThrow(...a),
    },
    gateBlock: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
    client: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockFindUniqueOrThrow(...a),
    },
    supplier: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockFindUniqueOrThrow(...a),
    },
    carrier: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
    user: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockFindUniqueOrThrow(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
    reservation: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => mockFindUniqueOrThrow(...a),
    },
    recurringReservation: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    clientSupplier: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
    auditLog: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// Sessions for each role. Two tenants (warehouseA, warehouseB) plus two
// suppliers, two clients, two carriers used to verify cross-tenant denial.
const adminSession = {
  user: {
    id: "u-admin",
    email: "admin@x",
    role: "ADMIN",
    warehouseIds: [],
    clientId: null,
    supplierId: null,
    carrierId: null,
    isVerified: true,
    canManageSuppliers: false,
  },
};

const workerASession = {
  user: {
    id: "u-worker-a",
    email: "wa@x",
    role: "WAREHOUSE_WORKER",
    warehouseIds: ["wh-A"],
    clientId: null,
    supplierId: null,
    carrierId: null,
    isVerified: true,
    canManageSuppliers: false,
  },
};

const supplierASession = {
  user: {
    id: "u-supplier-a",
    email: "sa@x",
    role: "SUPPLIER",
    warehouseIds: [],
    clientId: null,
    supplierId: "sup-A",
    carrierId: null,
    isVerified: true,
    canManageSuppliers: false,
  },
};

const clientASession = {
  user: {
    id: "u-client-a",
    email: "ca@x",
    role: "CLIENT",
    warehouseIds: [],
    clientId: "cli-A",
    supplierId: null,
    carrierId: null,
    isVerified: true,
    canManageSuppliers: true,
  },
};

const clientBSession = {
  user: {
    id: "u-client-b",
    email: "cb@x",
    role: "CLIENT",
    warehouseIds: [],
    clientId: "cli-B",
    supplierId: null,
    carrierId: null,
    isVerified: true,
    canManageSuppliers: false,
  },
};

const supplierBSession = {
  user: {
    id: "u-supplier-b",
    email: "sb@x",
    role: "SUPPLIER",
    warehouseIds: [],
    clientId: null,
    supplierId: "sup-B",
    carrierId: null,
    isVerified: true,
    canManageSuppliers: false,
  },
};

const carrierASession = {
  user: {
    id: "u-carrier-a",
    email: "cara@x",
    role: "CARRIER",
    warehouseIds: [],
    clientId: null,
    supplierId: null,
    carrierId: "car-A",
    isVerified: true,
    canManageSuppliers: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Cross-role denial: non-admins cannot invoke admin actions ────────────────

describe("admin actions: deny non-admins", () => {
  it.each([
    ["WAREHOUSE_WORKER", workerASession],
    ["CLIENT", clientASession],
    ["SUPPLIER", supplierASession],
    ["CARRIER", carrierASession],
  ])("getWarehouses denies %s", async (_role, session) => {
    mockAuth.mockResolvedValue(session);
    const { getWarehouses } = await import("@/lib/actions/admin");
    await expect(getWarehouses()).rejects.toThrow(/Admin only/);
  });

  it.each([
    ["WAREHOUSE_WORKER", workerASession],
    ["CLIENT", clientASession],
    ["SUPPLIER", supplierASession],
    ["CARRIER", carrierASession],
  ])("getUsers denies %s", async (_role, session) => {
    mockAuth.mockResolvedValue(session);
    const { getUsers } = await import("@/lib/actions/admin");
    await expect(getUsers()).rejects.toThrow(/Admin only/);
  });

  it.each([
    ["WAREHOUSE_WORKER", workerASession],
    ["CLIENT", clientASession],
    ["SUPPLIER", supplierASession],
    ["CARRIER", carrierASession],
  ])("getAuditLogs denies %s", async (_role, session) => {
    mockAuth.mockResolvedValue(session);
    const { getAuditLogs } = await import("@/lib/actions/admin");
    await expect(getAuditLogs()).rejects.toThrow(/Admin only/);
  });

  it("createWarehouse denies a worker", async () => {
    mockAuth.mockResolvedValue(workerASession);
    const { createWarehouse } = await import("@/lib/actions/admin");
    await expect(createWarehouse({ name: "evil" })).rejects.toThrow(/Admin only/);
  });

  it("approveUser denies a worker", async () => {
    mockAuth.mockResolvedValue(workerASession);
    const { approveUser } = await import("@/lib/actions/admin");
    await expect(approveUser("u-target", "sup-target")).rejects.toThrow(/Admin only/);
  });
});

// ─── Cross-tenant denial: workers cannot reach into other warehouses ──────────

describe("calendar.getCalendarData: warehouse scoping", () => {
  it("rejects a worker requesting a warehouse outside their assignment", async () => {
    mockAuth.mockResolvedValue(workerASession);
    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-B", new Date("2026-05-01"), new Date("2026-05-31")),
    ).rejects.toThrow(/Warehouse not in your assigned scope/);
  });

  it("allows a worker to request their own warehouse", async () => {
    mockAuth.mockResolvedValue(workerASession);
    // Set up the queries: gates list, reservation lists, warehouse, blocks, recurring
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ country: "CZ" });
    const { getCalendarData } = await import("@/lib/actions/calendar");
    const result = await getCalendarData("wh-A", new Date("2026-05-01"), new Date("2026-05-31"));
    expect(result.events).toEqual([]);
  });

  it("allows admin to request any warehouse", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ country: null });
    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-Z-anywhere", new Date("2026-05-01"), new Date("2026-05-31")),
    ).resolves.toBeDefined();
  });
});

// ─── Cross-tenant denial: recurring reservations ──────────────────────────────

describe("recurring-reservations: tenant scoping for workers", () => {
  it("createRecurringReservation rejects worker creating in unassigned warehouse", async () => {
    mockAuth.mockResolvedValue(workerASession);
    // gate lookup says the gate is in wh-B
    mockFindUnique.mockResolvedValue({ warehouseId: "wh-B" });
    const { createRecurringReservation } = await import("@/lib/actions/recurring-reservations");
    await expect(
      createRecurringReservation({
        gateId: "gate-in-B",
        clientId: "cli-A",
        recurrenceType: "DAILY",
        startDate: "2026-05-01",
        timeOfDay: "08:00",
        durationMinutes: 60,
        vehicleType: "TRUCK",
        items: [{ transportUnitId: "tu-1", quantity: 1 }],
      }),
    ).rejects.toThrow(/not in your assigned warehouse/);
  });

  it("deactivateRecurringReservation rejects worker for foreign tenant", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindUnique.mockResolvedValue({ gate: { warehouseId: "wh-B" } });
    const { deactivateRecurringReservation } = await import(
      "@/lib/actions/recurring-reservations"
    );
    await expect(deactivateRecurringReservation("rec-foreign")).rejects.toThrow(
      /not in your assigned warehouse/,
    );
  });

  it("cancelFutureInstances rejects worker for foreign tenant", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindUnique.mockResolvedValue({ gate: { warehouseId: "wh-B" } });
    const { cancelFutureInstances } = await import(
      "@/lib/actions/recurring-reservations"
    );
    await expect(cancelFutureInstances("rec-foreign")).rejects.toThrow(
      /not in your assigned warehouse/,
    );
  });

  it("manuallyGenerateInstances rejects worker for foreign tenant", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindUnique.mockResolvedValue({ gate: { warehouseId: "wh-B" } });
    const { manuallyGenerateInstances } = await import(
      "@/lib/actions/recurring-reservations"
    );
    await expect(manuallyGenerateInstances("rec-foreign")).rejects.toThrow(
      /not in your assigned warehouse/,
    );
  });

  it("getRecurringReservations rejects worker requesting foreign warehouse explicitly", async () => {
    mockAuth.mockResolvedValue(workerASession);
    const { getRecurringReservations } = await import(
      "@/lib/actions/recurring-reservations"
    );
    await expect(getRecurringReservations("wh-B")).rejects.toThrow(
      /not in your assigned scope/,
    );
  });

  it("getRecurringReservations narrows worker to their warehouseIds when no filter passed", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindMany.mockResolvedValue([]);
    const { getRecurringReservations } = await import(
      "@/lib/actions/recurring-reservations"
    );
    await getRecurringReservations();
    // The Prisma where clause must contain the worker's warehouseIds
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gate: { warehouseId: { in: ["wh-A"] } } },
      }),
    );
  });

  it("getRecurringReservations returns empty list for worker with zero warehouses", async () => {
    mockAuth.mockResolvedValue({
      user: { ...workerASession.user, warehouseIds: [] },
    });
    const { getRecurringReservations } = await import(
      "@/lib/actions/recurring-reservations"
    );
    const result = await getRecurringReservations();
    expect(result).toEqual([]);
    // Critically, no DB query was issued — no fall-through to "list all tenants"
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

// ─── Cross-tenant denial: reservation detail ──────────────────────────────────

describe("reservation detail: cross-instance denial", () => {
  it("supplier sees null when fetching another supplier's reservation", async () => {
    mockAuth.mockResolvedValue(supplierASession);
    mockFindUnique.mockResolvedValue({
      id: "res-other",
      reservationNumber: 1,
      status: "CONFIRMED",
      type: "UNLOADING",
      gateId: "g-1",
      gate: { warehouseId: "wh-A", name: "G", warehouse: { name: "W" } },
      clientId: "cli-A",
      supplierId: "sup-OTHER", // not the supplier in session
      carrierId: null,
      client: { name: "C" },
      supplier: { name: "S" },
      carrier: null,
      createdBy: { name: "U" },
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedVersion: null,
      pendingVersion: null,
      statusChanges: [],
      attachments: [],
    });
    const { getReservationDetail } = await import("@/lib/actions/reservations");
    const detail = await getReservationDetail("res-other");
    expect(detail).toBeNull();
  });

  it("client sees null when fetching another client's reservation (no shared supplier)", async () => {
    mockAuth.mockResolvedValue(clientASession);
    mockFindUnique.mockResolvedValue({
      id: "res-other",
      reservationNumber: 2,
      status: "CONFIRMED",
      type: "UNLOADING",
      gateId: "g-1",
      gate: { warehouseId: "wh-A", name: "G", warehouse: { name: "W" } },
      clientId: "cli-OTHER", // not the client in session
      supplierId: "sup-X",
      carrierId: null,
      client: { name: "C" },
      supplier: { name: "S" },
      carrier: null,
      createdBy: { name: "U" },
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedVersion: null,
      pendingVersion: null,
      statusChanges: [],
      attachments: [],
    });
    const { getReservationDetail } = await import("@/lib/actions/reservations");
    const detail = await getReservationDetail("res-other");
    expect(detail).toBeNull();
  });

  it("worker sees null when fetching reservation outside their warehouse", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindUnique.mockResolvedValue({
      id: "res-other",
      reservationNumber: 3,
      status: "CONFIRMED",
      type: "UNLOADING",
      gateId: "g-2",
      gate: { warehouseId: "wh-B", name: "G", warehouse: { name: "W" } },
      clientId: "cli-X",
      supplierId: "sup-X",
      carrierId: null,
      client: { name: "C" },
      supplier: { name: "S" },
      carrier: null,
      createdBy: { name: "U" },
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedVersion: null,
      pendingVersion: null,
      statusChanges: [],
      attachments: [],
    });
    const { getReservationDetail } = await import("@/lib/actions/reservations");
    const detail = await getReservationDetail("res-other");
    expect(detail).toBeNull();
  });

  it("carrier sees null when fetching another carrier's reservation", async () => {
    mockAuth.mockResolvedValue(carrierASession);
    mockFindUnique.mockResolvedValue({
      id: "res-other",
      reservationNumber: 4,
      status: "CONFIRMED",
      type: "UNLOADING",
      gateId: "g-1",
      gate: { warehouseId: "wh-A", name: "G", warehouse: { name: "W" } },
      clientId: "cli-X",
      supplierId: "sup-X",
      carrierId: "car-OTHER", // not the carrier in session
      client: { name: "C" },
      supplier: { name: "S" },
      carrier: { name: "Cx" },
      createdBy: { name: "U" },
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedVersion: null,
      pendingVersion: null,
      statusChanges: [],
      attachments: [],
    });
    const { getReservationDetail } = await import("@/lib/actions/reservations");
    const detail = await getReservationDetail("res-other");
    expect(detail).toBeNull();
  });
});

// ─── Reservation list: cross-tenant filtering on the SQL where clause ─────────

describe("reservation list: tenant filter is applied in SQL where clause", () => {
  it("supplier list filter targets only own supplierId", async () => {
    mockAuth.mockResolvedValue(supplierASession);
    mockFindMany.mockResolvedValue([]);
    const { getReservationList } = await import("@/lib/actions/reservations");
    await getReservationList();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ supplierId: "sup-A" }),
      }),
    );
  });

  it("client list filter targets only own clientId", async () => {
    mockAuth.mockResolvedValue(clientASession);
    mockFindMany.mockResolvedValue([]);
    const { getReservationList } = await import("@/lib/actions/reservations");
    await getReservationList();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: "cli-A" }),
      }),
    );
  });

  it("worker list filter targets only own warehouseIds", async () => {
    mockAuth.mockResolvedValue(workerASession);
    mockFindMany.mockResolvedValue([]);
    const { getReservationList } = await import("@/lib/actions/reservations");
    await getReservationList();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gate: { warehouseId: { in: ["wh-A"] } },
        }),
      }),
    );
  });

  it("carrier list filter targets only own carrierId", async () => {
    mockAuth.mockResolvedValue(carrierASession);
    mockFindMany.mockResolvedValue([]);
    const { getReservationList } = await import("@/lib/actions/reservations");
    await getReservationList();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ carrierId: "car-A" }),
      }),
    );
  });

  it("worker with no warehouses fails closed (does not list all tenants)", async () => {
    mockAuth.mockResolvedValue({
      user: { ...workerASession.user, warehouseIds: [] },
    });
    const { getReservationList } = await import("@/lib/actions/reservations");
    await expect(getReservationList()).rejects.toThrow(/INVALID_SESSION/);
  });

  it("supplier with missing supplierId fails closed", async () => {
    mockAuth.mockResolvedValue({
      user: { ...supplierASession.user, supplierId: null },
    });
    const { getReservationList } = await import("@/lib/actions/reservations");
    await expect(getReservationList()).rejects.toThrow(/INVALID_SESSION/);
  });
});

// ─── Notifications RPC surface: spoofing helpers must not be exported ─────────

describe("notifications.ts public surface", () => {
  it("does not export createNotificationsForEvent (would allow cross-tenant spoofing)", async () => {
    const mod: Record<string, unknown> = await import("@/lib/actions/notifications");
    expect(mod.createNotificationsForEvent).toBeUndefined();
  });

  it("does not export createRegistrationNotification (would allow admin-spam)", async () => {
    const mod: Record<string, unknown> = await import("@/lib/actions/notifications");
    expect(mod.createRegistrationNotification).toBeUndefined();
  });

  it("does not export createUserApprovalNotification (would allow approval spoof)", async () => {
    const mod: Record<string, unknown> = await import("@/lib/actions/notifications");
    expect(mod.createUserApprovalNotification).toBeUndefined();
  });
});

// ─── G12: CLIENT cannot see another client's reservation via supplier linkage ──

describe("G12: calendar CLIENT visibility — clientId-only rule", () => {
  it("CLIENT-A does not see detail of CLIENT-B reservation even when booked by shared supplier", async () => {
    // CLIENT-A (cli-A) is in session. The reservation belongs to cli-B, booked by sup-X.
    // Before fix: canSeeDetail = true if clientSupplierIds.has("sup-X").
    // After fix: canSeeDetail = false because r.clientId !== "cli-A".
    mockAuth.mockResolvedValue(clientASession);

    // gates query
    mockFindMany.mockResolvedValueOnce([{ id: "gate-1", name: "G1", description: null }]);
    // G5 scope check: CLIENT-A has its own reservation at this warehouse → pass
    mockFindFirst.mockResolvedValueOnce({ id: "res-cli-a-own" });
    // confirmed reservations: CLIENT-B's reservation booked by sup-X
    const crossClientReservation = {
      id: "res-cli-b",
      gateId: "gate-1",
      reservationNumber: 42,
      status: "CONFIRMED",
      type: "UNLOADING",
      clientId: "cli-B",
      supplierId: "sup-X",
      carrierId: null,
      pendingVersionId: null,
      confirmedVersionId: "cv-1",
      recurringReservationId: null,
      supplier: { name: "Supplier X" },
      client: { name: "Client B" },
      carrier: null,
      confirmedVersion: {
        id: "cv-1",
        startTime: new Date("2026-05-15T08:00:00Z"),
        durationMinutes: 60,
        vehicleType: "TRUCK",
        driverName: "John",
        licensePlate: "1AB2345",
        notes: "Confidential notes",
        items: [],
      },
      pendingVersion: null,
    };
    mockFindMany.mockResolvedValueOnce([crossClientReservation]); // confirmed reservations
    mockFindMany.mockResolvedValueOnce([]); // pending reservations
    mockFindUnique.mockResolvedValueOnce({ country: null }); // warehouse
    mockFindMany.mockResolvedValueOnce([]); // gateBlocks
    mockFindMany.mockResolvedValueOnce([]); // recurringReservations

    const { getCalendarData } = await import("@/lib/actions/calendar");
    const result = await getCalendarData("wh-A", new Date("2026-05-01"), new Date("2026-05-31"));

    expect(result.events).toHaveLength(1);
    const ev = result.events[0];
    // Must not expose detail — this is CLIENT-B's reservation, not CLIENT-A's
    expect(ev.isOwn).toBe(false);
    expect(ev.supplierName).toBeUndefined();
    expect(ev.licensePlate).toBeUndefined();
    expect(ev.driverName).toBeUndefined();
    expect(ev.notes).toBeUndefined();
  });

  it("CLIENT-A sees detail of their own reservation (same clientId)", async () => {
    mockAuth.mockResolvedValue(clientASession);

    mockFindMany.mockResolvedValueOnce([{ id: "gate-1", name: "G1", description: null }]);
    mockFindFirst.mockResolvedValueOnce({ id: "res-cli-a-own" }); // G5 pass
    const ownReservation = {
      id: "res-cli-a",
      gateId: "gate-1",
      reservationNumber: 10,
      status: "CONFIRMED",
      type: "UNLOADING",
      clientId: "cli-A", // matches session
      supplierId: "sup-X",
      carrierId: null,
      pendingVersionId: null,
      confirmedVersionId: "cv-2",
      recurringReservationId: null,
      supplier: { name: "Supplier X" },
      client: { name: "Client A" },
      carrier: null,
      confirmedVersion: {
        id: "cv-2",
        startTime: new Date("2026-05-15T10:00:00Z"),
        durationMinutes: 60,
        vehicleType: "TRUCK",
        driverName: "Jane",
        licensePlate: "9ZZ9999",
        notes: "Own notes",
        items: [],
      },
      pendingVersion: null,
    };
    mockFindMany.mockResolvedValueOnce([ownReservation]);
    mockFindMany.mockResolvedValueOnce([]);
    mockFindUnique.mockResolvedValueOnce({ country: null });
    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([]);

    const { getCalendarData } = await import("@/lib/actions/calendar");
    const result = await getCalendarData("wh-A", new Date("2026-05-01"), new Date("2026-05-31"));

    expect(result.events).toHaveLength(1);
    expect(result.events[0].isOwn).toBe(true);
    expect(result.events[0].supplierName).toBe("Supplier X");
  });
});

// ─── G5: External roles rejected for warehouses with no own reservations ──────

describe("G5: getCalendarData rejects external roles with no reservations at warehouse", () => {
  it("CLIENT is rejected for a warehouse where they have no reservations", async () => {
    mockAuth.mockResolvedValue(clientASession);
    // gates exist but no CLIENT-A reservations
    mockFindMany.mockResolvedValueOnce([{ id: "gate-1", name: "G1", description: null }]);
    mockFindFirst.mockResolvedValueOnce(null); // no match → scope denied

    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-unrelated", new Date("2026-05-01"), new Date("2026-05-31")),
    ).rejects.toThrow(/Warehouse not in your scope/);
  });

  it("SUPPLIER is rejected for a warehouse where they have no reservations", async () => {
    mockAuth.mockResolvedValue(supplierASession);
    mockFindMany.mockResolvedValueOnce([{ id: "gate-1", name: "G1", description: null }]);
    mockFindFirst.mockResolvedValueOnce(null);

    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-unrelated", new Date("2026-05-01"), new Date("2026-05-31")),
    ).rejects.toThrow(/Warehouse not in your scope/);
  });

  it("CARRIER is rejected for a warehouse where they have no reservations", async () => {
    mockAuth.mockResolvedValue(carrierASession);
    mockFindMany.mockResolvedValueOnce([{ id: "gate-1", name: "G1", description: null }]);
    mockFindFirst.mockResolvedValueOnce(null);

    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-unrelated", new Date("2026-05-01"), new Date("2026-05-31")),
    ).rejects.toThrow(/Warehouse not in your scope/);
  });

  it("CLIENT is rejected even when warehouse exists but has no gates (gateIds empty)", async () => {
    mockAuth.mockResolvedValue(clientASession);
    mockFindMany.mockResolvedValueOnce([]); // no gates → gateIds = []

    const { getCalendarData } = await import("@/lib/actions/calendar");
    await expect(
      getCalendarData("wh-no-gates", new Date("2026-05-01"), new Date("2026-05-31")),
    ).rejects.toThrow(/Warehouse not in your scope/);
  });
});

// ─── Public registration: cannot self-elevate to ADMIN ────────────────────────

describe("public registration: role cannot be controlled by caller", () => {
  it("registerSupplier always creates SUPPLIER, regardless of any extra fields", async () => {
    // No session needed — public action.
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u-new", name: "n", email: "e@x" });
    const { registerSupplier } = await import("@/lib/actions/auth-actions");
    await registerSupplier({ name: "n", email: "e@x", password: "secret123" });
    const createCall = mockCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.role).toBe("SUPPLIER");
    expect(createCall?.data?.isVerified).toBe(false);
  });

  it("registerCarrier always creates CARRIER unverified", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u-new", name: "n", email: "e@x" });
    const { registerCarrier } = await import("@/lib/actions/auth-actions");
    await registerCarrier({ name: "n", email: "e@x", password: "secret123" });
    const createCall = mockCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.role).toBe("CARRIER");
    expect(createCall?.data?.isVerified).toBe(false);
  });
});
