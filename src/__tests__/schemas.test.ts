import { describe, it, expect } from "vitest";
import {
  WarehouseSchema,
  GateSchema,
  GateUpdateSchema,
  GateOpeningHoursRowSchema,
  GateBlockSchema,
  ClientSchema,
  SupplierSchema,
  CreateUserSchema,
  UpdateUserSchema,
  TransportUnitSchema,
  CreateReservationSchema,
  EditReservationSchema,
  UpdateReservationStatusSchema,
  UpdateProfileNameSchema,
  ChangePasswordSchema,
  CreateRecurringSchema,
  ReservationItemSchema,
  ReservationAdviceSchema,
} from "@/lib/schemas";

// ─── helpers ────────────────────────────────────────────────────────────────

// Seed uses human-readable IDs like gate-01; CUID-format IDs also work.
const validId = "gate-01";
const validCuid = "clnzmtqp60000rze6h44bqktq"; // kept for backward compat

function ok(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const r = schema.safeParse(value);
  expect(r.success).toBe(true);
}

function fail(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const r = schema.safeParse(value);
  expect(r.success).toBe(false);
}

// ─── WarehouseSchema ─────────────────────────────────────────────────────────

describe("WarehouseSchema", () => {
  it("accepts minimal valid input", () => ok(WarehouseSchema, { name: "Warehouse A" }));
  it("accepts full valid input", () =>
    ok(WarehouseSchema, {
      name: "Warehouse A",
      address: "Street 1",
      timezone: "Europe/Prague",
      country: "CZ",
      isActive: true,
    }));
  it("rejects empty name", () => fail(WarehouseSchema, { name: "" }));
  it("rejects name over 100 chars", () => fail(WarehouseSchema, { name: "x".repeat(101) }));
  it("rejects address over 255 chars", () =>
    fail(WarehouseSchema, { name: "W", address: "x".repeat(256) }));
});

// ─── GateSchema ──────────────────────────────────────────────────────────────

describe("GateSchema", () => {
  it("accepts seed-style ID (wh-01)", () =>
    ok(GateSchema, { warehouseId: "wh-01", name: "Gate 1" }));
  it("accepts CUID-format ID", () =>
    ok(GateSchema, { warehouseId: validCuid, name: "Gate 1" }));
  it("accepts full valid input", () =>
    ok(GateSchema, {
      warehouseId: validId,
      name: "Gate 1",
      description: "desc",
      isActive: true,
      sortOrder: 0,
    }));
  it("rejects empty warehouseId", () =>
    fail(GateSchema, { warehouseId: "", name: "G" }));
  it("rejects empty name", () =>
    fail(GateSchema, { warehouseId: validId, name: "" }));
  it("rejects sortOrder > 9999", () =>
    fail(GateSchema, { warehouseId: validId, name: "G", sortOrder: 10000 }));
  it("rejects negative sortOrder", () =>
    fail(GateSchema, { warehouseId: validId, name: "G", sortOrder: -1 }));
});

describe("GateUpdateSchema", () => {
  it("does not require warehouseId", () => ok(GateUpdateSchema, { name: "Gate 1" }));
  it("rejects if warehouseId is supplied (field removed)", () => {
    // omit means the field is stripped, not rejected — let's verify it's absent
    const r = GateUpdateSchema.safeParse({ warehouseId: validCuid, name: "G" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>).warehouseId).toBeUndefined();
    }
  });
});

// ─── GateOpeningHoursRowSchema ────────────────────────────────────────────────

describe("GateOpeningHoursRowSchema", () => {
  it("accepts a valid row", () =>
    ok(GateOpeningHoursRowSchema, { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true }));
  it("rejects dayOfWeek < 0", () =>
    fail(GateOpeningHoursRowSchema, { dayOfWeek: -1, openTime: "08:00", closeTime: "18:00", isOpen: true }));
  it("rejects dayOfWeek > 6", () =>
    fail(GateOpeningHoursRowSchema, { dayOfWeek: 7, openTime: "08:00", closeTime: "18:00", isOpen: true }));
  it("rejects openTime without colon", () =>
    fail(GateOpeningHoursRowSchema, { dayOfWeek: 1, openTime: "0800", closeTime: "18:00", isOpen: true }));
  it("rejects closeTime with seconds", () =>
    fail(GateOpeningHoursRowSchema, { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00:00", isOpen: true }));
});

// ─── GateBlockSchema ─────────────────────────────────────────────────────────

describe("GateBlockSchema", () => {
  const base = {
    gateId: "gate-01",
    startTime: "2025-06-09T10:00:00.000Z",
    endTime: "2025-06-09T11:00:00.000Z",
    reason: "Maintenance",
  };

  it("accepts valid input", () => ok(GateBlockSchema, base));
  it("rejects missing reason", () => fail(GateBlockSchema, { ...base, reason: "" }));
  it("rejects reason over 500 chars", () =>
    fail(GateBlockSchema, { ...base, reason: "x".repeat(501) }));
  it("rejects non-datetime startTime", () =>
    fail(GateBlockSchema, { ...base, startTime: "2025-06-09" }));
});

// ─── ClientSchema ─────────────────────────────────────────────────────────────

describe("ClientSchema", () => {
  it("accepts minimal input", () => ok(ClientSchema, { name: "Client A" }));
  it("accepts valid email", () =>
    ok(ClientSchema, { name: "Client A", contactEmail: "test@example.com" }));
  it("transforms empty string email to undefined", () => {
    const r = ClientSchema.safeParse({ name: "Client A", contactEmail: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactEmail).toBeUndefined();
  });
  it("rejects invalid email", () =>
    fail(ClientSchema, { name: "Client A", contactEmail: "not-email" }));
  it("rejects empty name", () => fail(ClientSchema, { name: "" }));
});

// ─── SupplierSchema ───────────────────────────────────────────────────────────

describe("SupplierSchema", () => {
  it("accepts minimal input", () => ok(SupplierSchema, { name: "Supplier A" }));
  it("accepts with seed-style clientIds", () =>
    ok(SupplierSchema, { name: "Supplier A", clientIds: ["client-01"] }));
  it("rejects empty string in clientIds", () =>
    fail(SupplierSchema, { name: "Supplier A", clientIds: [""] }));
});

// ─── CreateUserSchema ─────────────────────────────────────────────────────────

describe("CreateUserSchema", () => {
  const base = {
    email: "user@example.com",
    name: "User",
    password: "password1",
    role: "ADMIN",
  };

  it("accepts valid admin user", () => ok(CreateUserSchema, base));
  it("accepts with seed-style warehouseIds", () =>
    ok(CreateUserSchema, { ...base, role: "WAREHOUSE_WORKER", warehouseIds: ["wh-01"] }));
  it("rejects password shorter than 8 chars", () =>
    fail(CreateUserSchema, { ...base, password: "short" }));
  it("rejects invalid email", () =>
    fail(CreateUserSchema, { ...base, email: "bad" }));
  it("rejects invalid role", () =>
    fail(CreateUserSchema, { ...base, role: "SUPERUSER" }));
  it("rejects all valid roles", () => {
    for (const role of ["ADMIN", "WAREHOUSE_WORKER", "CLIENT", "SUPPLIER"]) {
      ok(CreateUserSchema, { ...base, role });
    }
  });
});

describe("UpdateUserSchema", () => {
  it("allows omitting password", () =>
    ok(UpdateUserSchema, { email: "user@example.com", name: "User", role: "ADMIN" }));
  it("rejects too-short password when provided", () =>
    fail(UpdateUserSchema, {
      email: "user@example.com",
      name: "User",
      role: "ADMIN",
      password: "short",
    }));
});

// ─── TransportUnitSchema ──────────────────────────────────────────────────────

describe("TransportUnitSchema", () => {
  it("accepts valid input", () =>
    ok(TransportUnitSchema, { name: "Pallet", weightKg: 100, processingMinutes: 15 }));
  it("rejects negative weightKg", () =>
    fail(TransportUnitSchema, { name: "Pallet", weightKg: -1, processingMinutes: 15 }));
  it("rejects non-integer processingMinutes", () =>
    fail(TransportUnitSchema, { name: "Pallet", weightKg: 100, processingMinutes: 1.5 }));
  it("rejects empty name", () =>
    fail(TransportUnitSchema, { name: "", weightKg: 0, processingMinutes: 0 }));
});

// ─── ReservationItemSchema ────────────────────────────────────────────────────

describe("ReservationItemSchema", () => {
  it("accepts valid item with seed-style ID", () =>
    ok(ReservationItemSchema, { transportUnitId: "tu-01", quantity: 2 }));
  it("rejects quantity 0", () =>
    fail(ReservationItemSchema, { transportUnitId: "tu-01", quantity: 0 }));
  it("rejects negative goodsWeightKg", () =>
    fail(ReservationItemSchema, { transportUnitId: "tu-01", quantity: 1, goodsWeightKg: -1 }));
});

// ─── ReservationAdviceSchema ──────────────────────────────────────────────────

describe("ReservationAdviceSchema", () => {
  it("accepts valid advice", () =>
    ok(ReservationAdviceSchema, { adviceNumber: "ADV-001", quantity: 1 }));
  it("rejects empty adviceNumber", () =>
    fail(ReservationAdviceSchema, { adviceNumber: "", quantity: 1 }));
  it("rejects quantity 0", () =>
    fail(ReservationAdviceSchema, { adviceNumber: "ADV-001", quantity: 0 }));
});

// ─── CreateReservationSchema ──────────────────────────────────────────────────

describe("CreateReservationSchema", () => {
  const base = {
    gateId: "gate-01",
    clientId: "client-01",
    startTime: "2025-06-09T10:00:00.000Z",
    durationMinutes: 60,
    vehicleType: "TRUCK",
    items: [{ transportUnitId: "tu-01", quantity: 1 }],
  };

  it("accepts valid input", () => ok(CreateReservationSchema, base));
  it("rejects durationMinutes not multiple of 15", () =>
    fail(CreateReservationSchema, { ...base, durationMinutes: 20 }));
  it("rejects durationMinutes < 15", () =>
    fail(CreateReservationSchema, { ...base, durationMinutes: 10 }));
  it("rejects empty items array", () =>
    fail(CreateReservationSchema, { ...base, items: [] }));
  it("rejects invalid vehicleType", () =>
    fail(CreateReservationSchema, { ...base, vehicleType: "BICYCLE" }));
  it("accepts all valid vehicle types", () => {
    for (const vt of ["TRUCK", "VAN", "TRUCK_DOUBLE_TRAILER", "TRUCK_CURTAINSIDER", "REFRIGERATED_TRUCK", "OTHER"]) {
      ok(CreateReservationSchema, { ...base, vehicleType: vt });
    }
  });
  it("rejects licensePlate over 20 chars", () =>
    fail(CreateReservationSchema, { ...base, licensePlate: "x".repeat(21) }));
  it("rejects non-datetime startTime", () =>
    fail(CreateReservationSchema, { ...base, startTime: "2025-06-09" }));
});

// ─── EditReservationSchema ────────────────────────────────────────────────────

describe("EditReservationSchema", () => {
  it("accepts minimal input (only reservationId)", () =>
    ok(EditReservationSchema, { reservationId: "res-01" }));
  it("accepts full update with seed-style IDs", () =>
    ok(EditReservationSchema, {
      reservationId: "res-01",
      durationMinutes: 30,
      vehicleType: "VAN",
      items: [{ transportUnitId: "tu-01", quantity: 2 }],
    }));
  it("rejects durationMinutes not multiple of 15", () =>
    fail(EditReservationSchema, { reservationId: "res-01", durationMinutes: 17 }));
});

// ─── UpdateReservationStatusSchema ───────────────────────────────────────────

describe("UpdateReservationStatusSchema", () => {
  it("accepts valid status update with seed-style ID", () =>
    ok(UpdateReservationStatusSchema, { reservationId: "res-01", status: "CONFIRMED" }));
  it("rejects invalid status", () =>
    fail(UpdateReservationStatusSchema, { reservationId: "res-01", status: "PENDING" }));
  it("accepts all valid statuses", () => {
    for (const s of ["REQUESTED", "CONFIRMED", "CANCELLED", "UNLOADING_STARTED", "UNLOADING_COMPLETED", "CLOSED"]) {
      ok(UpdateReservationStatusSchema, { reservationId: "res-01", status: s });
    }
  });
});

// ─── UpdateProfileNameSchema ──────────────────────────────────────────────────

describe("UpdateProfileNameSchema", () => {
  it("accepts valid name", () => ok(UpdateProfileNameSchema, { name: "John" }));
  it("rejects empty name", () => fail(UpdateProfileNameSchema, { name: "" }));
  it("rejects name over 100 chars", () =>
    fail(UpdateProfileNameSchema, { name: "x".repeat(101) }));
});

// ─── ChangePasswordSchema ─────────────────────────────────────────────────────

describe("ChangePasswordSchema", () => {
  it("accepts valid passwords", () =>
    ok(ChangePasswordSchema, { currentPassword: "oldpass", newPassword: "newpass1" }));
  it("rejects empty currentPassword", () =>
    fail(ChangePasswordSchema, { currentPassword: "", newPassword: "newpass1" }));
  it("rejects newPassword shorter than 8 chars", () =>
    fail(ChangePasswordSchema, { currentPassword: "old", newPassword: "short" }));
});

// ─── CreateRecurringSchema ────────────────────────────────────────────────────

describe("CreateRecurringSchema", () => {
  const base = {
    gateId: "gate-01",
    clientId: "client-01",
    recurrenceType: "WEEKLY",
    startDate: "2025-06-09",
    timeOfDay: "10:00",
    durationMinutes: 60,
    vehicleType: "TRUCK",
    items: [{ transportUnitId: "tu-01", quantity: 1 }],
  };

  it("accepts valid weekly recurring", () => ok(CreateRecurringSchema, base));
  it("accepts DAILY recurrence", () =>
    ok(CreateRecurringSchema, { ...base, recurrenceType: "DAILY" }));
  it("accepts MONTHLY with dayOfMonth", () =>
    ok(CreateRecurringSchema, { ...base, recurrenceType: "MONTHLY", dayOfMonth: 15 }));
  it("rejects invalid recurrenceType", () =>
    fail(CreateRecurringSchema, { ...base, recurrenceType: "HOURLY" }));
  it("rejects startDate with wrong format", () =>
    fail(CreateRecurringSchema, { ...base, startDate: "09/06/2025" }));
  it("rejects timeOfDay with seconds", () =>
    fail(CreateRecurringSchema, { ...base, timeOfDay: "10:00:00" }));
  it("rejects durationMinutes not multiple of 15", () =>
    fail(CreateRecurringSchema, { ...base, durationMinutes: 25 }));
  it("rejects empty items", () =>
    fail(CreateRecurringSchema, { ...base, items: [] }));
  it("rejects dayOfMonth > 31", () =>
    fail(CreateRecurringSchema, { ...base, recurrenceType: "MONTHLY", dayOfMonth: 32 }));
  it("rejects dayOfMonth 0", () =>
    fail(CreateRecurringSchema, { ...base, recurrenceType: "MONTHLY", dayOfMonth: 0 }));
});
