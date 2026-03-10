# Critical Findings

Validated on 2026-03-09 by direct code inspection and a passing Vitest run (`45/45` tests). This file supersedes overlapping or inaccurate notes from the earlier review draft.

## C1. Broken Overlap Detection in `isSlotFree`

**Files:** `src/lib/actions/reservations.ts:77-101`
**Severity:** Critical
**Category:** Data Integrity / Scheduling

### Description

`isSlotFree()` checks only a single matching reservation version via `findFirst()`. If the first row Prisma returns ends before the requested slot, the function returns `true` even if another confirmed reservation on the same gate still overlaps.

This is more severe than a normal race condition because it can produce a false "slot is free" result even in single-request scenarios.

### Impact

- Overlapping reservations can be accepted for the same gate
- Warehouse operators can see apparently valid bookings that are already in conflict
- `createReservation`, `approveReservation`, and critical `editReservation` flows all rely on this helper

### Recommendation

Replace the helper with a real overlap query, for example by checking whether any confirmed reservation satisfies:

```typescript
existing.startTime < requestedEnd && existingEnd > requestedStart;
```

This should be implemented in SQL or Prisma logic that considers all candidate reservations, not just one row.

---

## C2. TOCTOU Race Condition on Availability Checks

**Files:** `src/lib/actions/reservations.ts:172-210`, `:309-321`, `:1029-1042`
**Severity:** Critical
**Category:** Data Integrity / Concurrency

### Description

Availability is checked before writes, but the check and the subsequent `create` or `update` are not wrapped in one database transaction. Two concurrent requests can both observe the slot as available and then both persist conflicting state.

This affects:

- `createReservation`
- `approveReservation`
- critical-path `editReservation`

### Impact

- Double-booked docks
- Operational collisions at the warehouse
- Hard-to-reconcile audit history after conflicting writes

### Recommendation

Move the overlap check and the write into a single `prisma.$transaction`, ideally with a serializable isolation level or a stronger database-side exclusion strategy.

---

## C3. Warehouse Scope Is Not Enforced on Reservation Mutations and Reads

**Files:** `src/lib/actions/reservations.ts:130-154`, `:286-527`, `:805-840`, `src/lib/actions/calendar.ts:32-44`
**Severity:** Critical
**Category:** Authorization

### Description

Warehouse workers are checked by role, but not by assignment, across several actions. A worker can act on reservations or form data outside their own warehouse scope.

Confirmed cases:

- `createReservation` allows worker-created reservations for any gate
- `approveReservation` and `rejectReservation` do not verify the reservation belongs to an assigned warehouse
- `updateReservationStatus` does not verify warehouse ownership
- `getFormData(warehouseId)` accepts any warehouse id
- `getCalendarData(warehouseId, ...)` accepts any warehouse id

### Impact

- Cross-warehouse data access
- Cross-warehouse approval and status manipulation
- Workers can act outside their operational responsibility boundary

### Recommendation

For every warehouse-scoped action, resolve the warehouse of the target gate or reservation and reject access unless it is contained in `session.user.warehouseIds`.

---

## C4. Empty Scope Values Fall Back to Unrestricted Access

**Files:** `src/lib/actions/reservations.ts:596-601`, `:767-772`, `src/lib/actions/calendar.ts:159-167`
**Severity:** Critical
**Category:** Authorization / Data Leakage

### Description

Several filters are conditional on scope values being present. If a worker has no `warehouseIds`, or a client or supplier has a null `clientId` or `supplierId`, the scope filter is skipped instead of failing closed.

Confirmed cases:

- `getReservationList()`
- `getReservationDetail()`
- `getWarehouses()` in calendar actions

This issue is amplified by JWT claim staleness: a user can keep an old session even after their underlying relationship changes.

### Impact

- A worker with no warehouse assignments can see all reservations
- A client or supplier whose relation was nulled can read data outside their own account
- Unauthorized users receive broader visibility precisely when their session becomes inconsistent

### Recommendation

Fail closed. For scoped roles, explicitly require the expected scope to exist:

```typescript
if (role === "CLIENT" && !clientId) throw new Error("INVALID_SESSION");
if (role === "SUPPLIER" && !supplierId) throw new Error("INVALID_SESSION");
if (role === "WAREHOUSE_WORKER" && warehouseIds.length === 0)
  throw new Error("INVALID_SESSION");
```

Then apply filters unconditionally.
