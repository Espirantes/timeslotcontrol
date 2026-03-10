import { z } from "zod";

// ─── Common ───────────────────────────────────────────────────────────────────

const cuid = () => z.string().cuid();
const optEmail = z.string().email().max(255).optional().or(z.literal("").transform(() => undefined));
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

// ─── Warehouse ────────────────────────────────────────────────────────────────

export const WarehouseSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(255).optional(),
  timezone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

// ─── Gate ─────────────────────────────────────────────────────────────────────

export const GateSchema = z.object({
  warehouseId: cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const GateUpdateSchema = GateSchema.omit({ warehouseId: true });

export const GateOpeningHoursRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: timeStr,
  closeTime: timeStr,
  isOpen: z.boolean(),
});

export const GateBlockSchema = z.object({
  gateId: cuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().min(1).max(500),
});

// ─── Client ───────────────────────────────────────────────────────────────────

export const ClientSchema = z.object({
  name: z.string().min(1).max(100),
  contactEmail: optEmail,
  canManageSuppliers: z.boolean().optional(),
});

// ─── Supplier ─────────────────────────────────────────────────────────────────

export const SupplierSchema = z.object({
  name: z.string().min(1).max(100),
  contactEmail: optEmail,
  clientIds: z.array(cuid()).optional(),
});

// ─── User ─────────────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(["ADMIN", "WAREHOUSE_WORKER", "CLIENT", "SUPPLIER"]);

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  role: UserRoleSchema,
  warehouseIds: z.array(cuid()).optional(),
  clientId: cuid().optional(),
  supplierId: cuid().optional(),
});

export const UpdateUserSchema = CreateUserSchema.extend({
  password: z.string().min(8).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ─── Transport Unit ───────────────────────────────────────────────────────────

export const TransportUnitSchema = z.object({
  name: z.string().min(1).max(100),
  weightKg: z.number().min(0),
  processingMinutes: z.number().int().min(0),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ─── Reservation ──────────────────────────────────────────────────────────────

export const VehicleTypeSchema = z.enum(["TRUCK", "VAN", "TRUCK_DOUBLE_TRAILER", "TRUCK_CURTAINSIDER", "REFRIGERATED_TRUCK", "OTHER"]);
export const ReservationTypeSchema = z.enum(["LOADING", "UNLOADING"]);
export const ReservationStatusSchema = z.enum(["REQUESTED", "CONFIRMED", "CANCELLED", "UNLOADING_STARTED", "UNLOADING_COMPLETED", "CLOSED"]);

export const ReservationItemSchema = z.object({
  transportUnitId: cuid(),
  quantity: z.number().int().min(1),
  goodsWeightKg: z.number().min(0).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const ReservationAdviceSchema = z.object({
  adviceNumber: z.string().min(1).max(100),
  quantity: z.number().int().min(1),
  note: z.string().max(500).nullable().optional(),
});

export const CreateReservationSchema = z.object({
  gateId: cuid(),
  clientId: cuid(),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().min(15).multipleOf(15),
  vehicleType: VehicleTypeSchema,
  licensePlate: z.string().max(20).optional(),
  sealNumbers: z.string().max(200).optional(),
  driverName: z.string().max(100).optional(),
  driverContact: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(ReservationItemSchema).min(1),
  advices: z.array(ReservationAdviceSchema).optional(),
  reservationType: ReservationTypeSchema.optional(),
});

export const EditReservationSchema = z.object({
  reservationId: cuid(),
  startTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).multipleOf(15).optional(),
  vehicleType: VehicleTypeSchema.optional(),
  licensePlate: z.string().max(20).nullable().optional(),
  sealNumbers: z.string().max(200).nullable().optional(),
  driverName: z.string().max(100).nullable().optional(),
  driverContact: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(ReservationItemSchema).min(1).optional(),
  advices: z.array(ReservationAdviceSchema).optional(),
  reservationType: ReservationTypeSchema.optional(),
});

export const UpdateReservationStatusSchema = z.object({
  reservationId: cuid(),
  status: ReservationStatusSchema,
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const UpdateProfileNameSchema = z.object({
  name: z.string().min(1).max(100),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// ─── Recurring Reservation ───────────────────────────────────────────────────

export const RecurrenceTypeSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

export const RecurringItemSchema = z.object({
  transportUnitId: cuid(),
  quantity: z.number().int().min(1),
  goodsWeightKg: z.number().min(0).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const CreateRecurringSchema = z.object({
  gateId: cuid(),
  clientId: cuid(),
  recurrenceType: RecurrenceTypeSchema,
  startDate: dateStr,
  endDate: dateStr.optional(),
  timeOfDay: timeStr,
  durationMinutes: z.number().int().min(15).multipleOf(15),
  weekDays: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  vehicleType: VehicleTypeSchema,
  licensePlate: z.string().max(20).optional(),
  driverName: z.string().max(100).optional(),
  driverContact: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(RecurringItemSchema).min(1),
  reservationType: ReservationTypeSchema.optional(),
});
