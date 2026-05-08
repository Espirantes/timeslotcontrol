# Role-Visibility Matrix

Authoritative map of who can access what. Every page, API route, and server action × every role.
Source of truth for RBAC behaviour. Any deviation is a bug.

## Roles

| Role               | Token scope                                      |
| ------------------ | ------------------------------------------------ |
| `ADMIN`            | global; all warehouses, all clients, suppliers   |
| `WAREHOUSE_WORKER` | scoped by `session.user.warehouseIds`            |
| `CLIENT`           | scoped by `session.user.clientId` + linked suppliers |
| `SUPPLIER`         | scoped by `session.user.supplierId`              |
| `CARRIER`          | scoped by `session.user.carrierId`               |

Tenant boundary = `Warehouse`. A reservation belongs to a warehouse via `gate.warehouseId`.
A `WAREHOUSE_WORKER`'s tenant scope is the set of warehouses linked via `UserWarehouse`.

Cells:
- `allowed` — full access; data returned without filtering
- `scoped` — access permitted but rows/details filtered to the role's tenant + ownership
- `denied` — page redirects to `/calendar`, action throws, or API returns 403/404
- `partial` — meta visible (e.g. an "Occupied" event on calendar), no detail
- `n/a` — role cannot reach this surface in normal UI

A `denied` row MUST also reject direct URL or RPC invocation. UI hiding alone is not enough.

## Pages (under `[locale]/(dashboard)/...`)

| Page                       | ADMIN  | WAREHOUSE_WORKER             | CLIENT             | SUPPLIER | CARRIER |
| -------------------------- | ------ | ---------------------------- | ------------------ | -------- | ------- |
| `/calendar`                | allowed | scoped to warehouseIds      | scoped (own + linked suppliers as detail; rest partial) | scoped (own as detail; rest partial) | scoped (own as detail; rest partial) |
| `/reservations`            | allowed | scoped to warehouseIds      | scoped (own clientId) | scoped (own supplierId) | scoped (own carrierId) |
| `/reservations/[id]`       | allowed | scoped (404 if not in warehouse) | scoped (404 if not own client) | scoped (404 if not own supplier) | scoped (404 if not own carrier) |
| `/settings`                | allowed | allowed                     | allowed            | allowed  | allowed |
| `/guide`                   | allowed | allowed                     | allowed            | allowed  | allowed |
| `/recurring-reservations`  | allowed | scoped to warehouseIds      | denied             | denied   | denied |
| `/my-suppliers`            | denied | denied                      | allowed iff `canManageSuppliers` | denied | denied |
| `/warehouses`              | allowed | denied                      | denied             | denied   | denied |
| `/gates`                   | allowed | denied                      | denied             | denied   | denied |
| `/clients`                 | allowed | denied                      | denied             | denied   | denied |
| `/suppliers`               | allowed | denied                      | denied             | denied   | denied |
| `/carriers`                | allowed | denied                      | denied             | denied   | denied |
| `/users`                   | allowed | denied                      | denied             | denied   | denied |
| `/transport-units`         | allowed | denied                      | denied             | denied   | denied |
| `/audit-log`               | allowed | denied                      | denied             | denied   | denied |
| `/tech-guide`              | allowed | denied                      | denied             | denied   | denied |

Auth pages `/login`, `/register`, `/forgot-password`, `/reset-password/[token]` are public (no session needed).

## API routes (under `/api/...`)

| Route                                                  | Method | ADMIN  | WAREHOUSE_WORKER         | CLIENT (own res.) | SUPPLIER (own res.) | CARRIER (own res.) | Cross-tenant |
| ------------------------------------------------------ | ------ | ------ | ------------------------ | ----------------- | ------------------- | ------------------ | ------------ |
| `/api/auth/[...nextauth]`                              | GET, POST | n/a (NextAuth) | n/a               | n/a               | n/a                 | n/a                | n/a          |
| `/api/reservations/[id]/attachments`                   | POST   | allowed | scoped (warehouse 403) | scoped (clientId 403) | scoped (supplierId 403) | scoped (carrierId 403) | denied (403) |
| `/api/reservations/[id]/attachments/[attachmentId]`    | GET    | allowed | scoped (warehouse 403) | scoped             | scoped              | scoped              | denied (403) |
| `/api/reservations/[id]/attachments/[attachmentId]`    | DELETE | allowed | scoped (warehouse 403) | scoped             | scoped              | scoped              | denied (403) |

## Server actions (`src/lib/actions/`)

### `admin.ts` — admin CRUD

| Action                                                            | ADMIN  | WAREHOUSE_WORKER         | CLIENT  | SUPPLIER | CARRIER |
| ----------------------------------------------------------------- | ------ | ------------------------ | ------- | -------- | ------- |
| `getWarehouses` / `createWarehouse` / `updateWarehouse` / `deleteWarehouse` | allowed | denied | denied  | denied   | denied |
| `getGates` / `createGate` / `updateGate` / `updateGateOpeningHours` / `deleteGate` | allowed | denied | denied  | denied   | denied |
| `getGateBlocks` / `createGateBlock` / `deleteGateBlock`           | allowed | allowed (warehouse-scoped — see gap G14) | denied  | denied   | denied |
| `getClients` / `createClient` / `updateClient` / `deleteClient` / `bulkToggleCanManageSuppliers` | allowed | denied | denied  | denied   | denied |
| `getSuppliers` / `createSupplier` / `updateSupplier` / `deleteSupplier` | allowed | denied | denied  | denied   | denied |
| `getCarriers` / `createCarrier` / `updateCarrier` / `deleteCarrier` | allowed | denied | denied  | denied   | denied |
| `getUsers` / `getPendingUsersCount` / `createUser` / `updateUser` / `deleteUser` / `approveUser` / `rejectUser` | allowed | denied | denied  | denied   | denied |
| `getTransportUnits` / `createTransportUnit` / `updateTransportUnit` / `deleteTransportUnit` | allowed | denied | denied  | denied   | denied |
| `getAuditLogs`                                                    | allowed | denied | denied  | denied   | denied |

### `reservations.ts` — reservation lifecycle

| Action                       | ADMIN   | WAREHOUSE_WORKER                          | CLIENT (canManageSuppliers) | SUPPLIER     | CARRIER       |
| ---------------------------- | ------- | ----------------------------------------- | --------------------------- | ------------ | ------------- |
| `getGateHolidays`            | allowed | allowed                                   | allowed                     | allowed      | allowed       |
| `getGateBlocksForDate`       | allowed | allowed                                   | allowed                     | allowed      | allowed       |
| `createReservation`          | allowed | scoped (gate must be in warehouseIds)     | scoped (own clientId; supplier must be linked) | scoped (own supplierId; client must be linked) | scoped (own carrierId; supplier must be linked to carrier and to client) |
| `approveReservation`         | allowed | scoped (warehouse access)                 | denied                      | denied       | denied        |
| `rejectReservation`          | allowed | scoped (warehouse access)                 | denied                      | denied       | denied        |
| `updateReservationStatus`    | allowed | scoped (warehouse access)                 | denied                      | denied       | denied        |
| `getReservationList`         | allowed | scoped (warehouseIds filter)              | scoped (clientId)           | scoped (supplierId) | scoped (carrierId) |
| `getReservationDetail`       | allowed | scoped (returns null if other warehouse)  | scoped (null if other client) | scoped (null if other supplier) | scoped (null if other carrier) |
| `getFormData(warehouseId)`   | allowed (all clients/suppliers/carriers) | allowed (warehouse scope on gates only — *gap G15*) | scoped (own client + carriers under own suppliers) | scoped (own supplier + linked carriers) | scoped (own carrier) |
| `editReservation`            | allowed | scoped (no per-row check before edit — *gap G16*) | scoped (own clientId required) | scoped (own supplierId required) | scoped — *gap G17 (no CARRIER ownership check)* |

### `recurring-reservations.ts` — recurring schedules

| Action                                | ADMIN   | WAREHOUSE_WORKER       | CLIENT | SUPPLIER | CARRIER |
| ------------------------------------- | ------- | ---------------------- | ------ | -------- | ------- |
| `getRecurringReservations`            | allowed | scoped to warehouseIds | denied | denied   | denied |
| `createRecurringReservation`          | allowed | scoped to warehouseIds | denied | denied   | denied |
| `deactivateRecurringReservation`      | allowed | scoped (must be in worker's warehouses) | denied | denied | denied |
| `cancelFutureInstances`               | allowed | scoped (must be in worker's warehouses) | denied | denied | denied |
| `manuallyGenerateInstances`           | allowed | scoped (must be in worker's warehouses) | denied | denied | denied |
| `generateInstances` (internal helper) | n/a     | n/a                    | n/a    | n/a      | n/a     |

### `calendar.ts`

| Action                            | ADMIN  | WAREHOUSE_WORKER            | CLIENT                                   | SUPPLIER                                 | CARRIER                                  |
| --------------------------------- | ------ | --------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `getWarehouses` (for picker)      | allowed | scoped to warehouseIds     | allowed (active list)                    | allowed (active list)                    | allowed (active list)                    |
| `getCalendarData(warehouseId,…)`  | allowed | scoped (must include warehouseId) | scoped (events partial unless own/linked supplier) | scoped (events partial unless own supplier) | scoped (events partial unless own carrier) |

### `client-actions.ts` — client self-service

| Action                       | ADMIN  | WAREHOUSE_WORKER | CLIENT (canManageSuppliers) | SUPPLIER | CARRIER |
| ---------------------------- | ------ | ---------------- | --------------------------- | -------- | ------- |
| `getMySuppliers`             | denied | denied           | allowed (scoped to clientId) | denied   | denied  |
| `createSupplierWithUser`     | denied | denied           | allowed (scoped: new supplier auto-linked to clientId; existing supplier must already be linked) | denied | denied |
| `deactivateSupplierUser`     | denied | denied           | allowed (target user must belong to a supplier linked to clientId) | denied | denied |

### `auth-actions.ts` — public registration

| Action             | Public | All roles | Notes                                                            |
| ------------------ | ------ | --------- | ---------------------------------------------------------------- |
| `registerSupplier` | yes    | n/a       | Creates unverified SUPPLIER user; admins receive notification.   |
| `registerCarrier`  | yes    | n/a       | Creates unverified CARRIER user; admins receive notification.    |

### `password-reset.ts` — public

| Action                  | Public | Notes                                                                          |
| ----------------------- | ------ | ------------------------------------------------------------------------------ |
| `requestPasswordReset`  | yes    | Always returns ok=true (no email enumeration).                                |
| `validateResetToken`    | yes    | Returns email if token still valid.                                           |
| `resetPassword`         | yes    | Token-bound. *Gap G18: no audit log entry on success.*                         |

### `settings.ts` — current user

| Action                          | All authenticated roles | Notes                                              |
| ------------------------------- | ----------------------- | -------------------------------------------------- |
| `getProfileData`                | scoped to current user  |                                                    |
| `updateProfileName`             | scoped to current user  | audit emitted                                      |
| `changePassword`                | scoped to current user  | audit emitted; current password verified           |
| `updateNotificationPreferences` | scoped to current user  | *Gap G19: no audit log entry.*                     |

### `notifications.ts` — in-app notifications

| Action                              | Visibility                 | Notes                                                |
| ----------------------------------- | -------------------------- | ---------------------------------------------------- |
| `getUnreadCount`                    | scoped to current user     |                                                      |
| `getNotifications(limit)`           | scoped to current user     | limit clamped to [1, 100]                            |
| `markAsRead`                        | scoped to current user     |                                                      |
| `markAllAsRead`                     | scoped to current user     |                                                      |
| `createNotificationsForEvent`       | **internal helper**        | After fix G7: not exposed as `"use server"` RPC.     |
| `createRegistrationNotification`    | **internal helper**        | After fix G7: not exposed as `"use server"` RPC.     |
| `createUserApprovalNotification`    | **internal helper**        | After fix G7: not exposed as `"use server"` RPC.     |

### `import.ts` — admin bulk import

| Action                | ADMIN  | All other roles | Notes                                                      |
| --------------------- | ------ | --------------- | ---------------------------------------------------------- |
| `bulkImportClients`   | allowed | denied          | *Gap G11: no audit log entries.*                           |
| `bulkImportSuppliers` | allowed | denied          | *Gap G11: no audit log entries.*                           |
| `bulkImportCarriers`  | allowed | denied          | *Gap G11: no audit log entries.*                           |
| `bulkImportUsers`     | allowed | denied          | *Gap G11: no audit log entries.*                           |

### `wizard.ts` — onboarding tour helpers

| Action                  | ADMIN  | All other roles |
| ----------------------- | ------ | --------------- |
| `createWizardDemoData`  | allowed | denied          |
| `cleanupWizardDemoData` | allowed | denied          |

## Notification recipients (per event)

| Event                  | Recipients                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `RESERVATION_CREATED`  | All `ADMIN` users + `WAREHOUSE_WORKER` users assigned to the reservation's warehouse.       |
| `CHANGE_REQUESTED`     | Same as above.                                                                              |
| `RESERVATION_APPROVED` | `CLIENT` users on the booking client + `SUPPLIER` users on the booking supplier.            |
| `RESERVATION_REJECTED` | Same as above.                                                                              |
| `STATUS_CHANGED`       | Same as above.                                                                              |
| `USER_REGISTERED`      | All `ADMIN` users.                                                                          |
| `USER_APPROVED` / `USER_REJECTED` | The target user only.                                                            |

A `SUPPLIER` user must never receive a notification about another supplier's reservation.
A `CLIENT` user must never receive a notification about another client's reservation.
A `WAREHOUSE_WORKER` user must never receive a notification about a warehouse they are not assigned to.
A `CARRIER` user currently does not receive any in-app or email reservation notifications — that is by design today, but a known UX gap.

## Audit log requirements

Every privileged action MUST produce one `AuditLog` row containing:

- `entityType` + `entityId` (the target)
- `action` (`created`, `updated`, `deleted`, `status_changed`, `version_approved`, `version_rejected`, `version_proposed`, `profile_updated`, `password_changed`, `registered`, `approved`, `rejected`, `deactivated`, `bulk_updated`)
- `userId` (the actor) — REQUIRED whenever the action is by a logged-in user
- `oldData` and/or `newData` for state-mutating changes
- *Gap G9: no `warehouseId`/`tenantId` column today; tenant context is implicit via `entityId`. Filed for follow-up — schema migration.*

Surfaces that MUST emit audit:
admin CRUD (warehouse, gate, gate-block, client, supplier, carrier, user, transport-unit, gate-opening-hours), reservation lifecycle (`created`, `version_proposed`, `version_approved`, `version_rejected`, `status_changed`, `updated`), user registration (`registered`), user approve/reject/deactivate, profile updates, password change/reset, attachment create/delete, recurring-reservation create/deactivate/cancel-future, bulk imports, bulk toggles.

## Known gaps (filed in this matrix; tracked separately)

| ID  | Severity | Gap                                                                                                                                  | Status this pass     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| G1  | critical | `getRecurringReservations` returns all tenants when called with no `warehouseId`; page sends only `warehouseIds[0]` for workers      | fixed                |
| G2  | critical | `createRecurringReservation` does not check `requireWarehouseAccess` for workers                                                     | fixed                |
| G3  | critical | `deactivateRecurringReservation` / `cancelFutureInstances` / `manuallyGenerateInstances` no warehouse check                          | fixed                |
| G4  | critical | `getCalendarData(warehouseId)` lets a worker request any warehouse's full data                                                       | fixed                |
| G5  | medium   | Non-admin requests to `getCalendarData` for unrelated warehouse leak gate names + activity timing (events show as "Occupied")        | follow-up — needs CEO policy call |
| G6  | critical | Attachment routes (`POST /attachments`, `GET`/`DELETE /attachments/[attachmentId]`) miss the `CARRIER` ownership check               | fixed                |
| G7  | critical | `notifications.ts` exports `createNotificationsForEvent`, `createRegistrationNotification`, `createUserApprovalNotification` as server-action RPCs without ownership/role guards — any logged-in user can spoof notifications cross-tenant | fixed                |
| G8  | medium   | `notifyReservationCreated` worker recipient query uses `warehouseId: gateId` instead of the gate's warehouseId — workers never get the email | fixed                |
| G9  | medium   | `AuditLog` has no explicit `warehouseId`/`tenantId` column                                                                           | follow-up (schema)   |
| G10 | medium   | `password-reset.ts:resetPassword` does not write an audit log entry on success                                                       | fixed                |
| G11 | medium   | `import.ts` bulk imports emit no audit log entries                                                                                   | follow-up            |
| G12 | high     | A `CLIENT` linked to a shared `SUPPLIER` sees details of reservations that supplier booked for *other* clients                       | follow-up — needs CEO policy call |
| G13 | low      | `updateNotificationPreferences` does not emit audit                                                                                  | follow-up            |
| G14 | low      | `getGateBlocks(gateId)` and `createGateBlock`/`deleteGateBlock` do not constrain the worker to gates in their own warehouses         | follow-up            |
| G15 | low      | `getFormData(warehouseId)` does not check that a worker is assigned to that warehouse                                                | follow-up            |
| G16 | medium   | `editReservation` for a `WAREHOUSE_WORKER` does not enforce `requireWarehouseAccess` against the reservation's gate before mutating | follow-up            |
| G17 | high     | `editReservation` does not check `CARRIER.carrierId` against `reservation.carrierId`                                                 | follow-up            |
| G18 | low      | (covered by G10)                                                                                                                     | —                    |
| G19 | low      | (covered by G13)                                                                                                                     | —                    |

## Test coverage

Risk-weighted automated tests live in `src/__tests__/role-visibility.test.ts`. They cover:

- direct cross-tenant invocation of admin actions by non-admins → throws
- worker requesting another warehouse's calendar data → throws
- worker creating/deactivating recurring reservation in another warehouse → throws
- supplier reading another supplier's reservation detail → returns null
- client reading another client's reservation detail → returns null
- carrier uploading attachment to a non-own reservation → 403
- supplier list filter only returns own reservations
- client list filter only returns own client's reservations
- worker list filter only returns own warehouses' reservations
- non-admin invocation of admin server actions → throws

100% of the cells in this matrix are claim-checked at least once (either by code review or automated test). The risk-weighted automated tests cover the highest-impact denial cases. A full E2E sweep is out of scope (see GAT-?? follow-up issue).
