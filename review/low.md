# Low Findings

Validated on 2026-03-09. Includes original findings plus Vercel React Best Practices audit (L19–L21).

## L1. `createUser` Does Not Enforce Strong Password Rules

**File:** `src/lib/actions/admin.ts:230-256`
**Severity:** Low
**Category:** Security

### Description

User creation accepts any password string and relies only on hashing.

### Recommendation

Add a minimum strength policy and enforce it server-side.

---

## L2. Delete Audit Entries Omit `oldData`

**File:** `src/lib/actions/admin.ts`
**Severity:** Low
**Category:** Auditability

### Description

Delete flows record the action but generally do not persist the pre-delete entity snapshot.

### Recommendation

Fetch the entity before deletion and include a compact `oldData` payload in the audit log.

---

## L3. User Deactivation Is Logged as Generic `updated`

**File:** `src/lib/actions/admin.ts:301-305`
**Severity:** Low
**Category:** Auditability / Semantics

### Description

`deleteUser()` performs a soft delete but logs the action as `updated`.

### Recommendation

Use a more specific audit action such as `deactivated`.

---

## L4. Notification Preference Changes Are Not Audited

**File:** `src/lib/actions/settings.ts:127-136`
**Severity:** Low
**Category:** Auditability

### Description

Other profile mutations are audited, but notification preference changes are not.

### Recommendation

Add an audit entry for notification preference updates.

---

## L5. `getWarehouses()` Reveals the Full Warehouse List to Clients and Suppliers

**File:** `src/lib/actions/calendar.ts:153-167`
**Severity:** Low
**Category:** Information Disclosure

### Description

Non-worker, non-admin roles receive all active warehouses.

### Recommendation

Filter warehouses to those the current user actually needs to interact with.

---

## L6. `hasPendingChange` Is Exposed to Non-Owning Calendar Viewers

**File:** `src/lib/actions/calendar.ts:65-89`
**Severity:** Low
**Category:** Information Disclosure

### Description

The event payload includes pending-change state even when the caller is not the owner of the reservation.

### Recommendation

Only expose this field to users who are allowed to view reservation workflow detail.

---

## L7. Error Handling Is Inconsistent Across Actions

**Files:** `src/lib/actions/*`
**Severity:** Low
**Category:** Code Quality / UX

### Description

The codebase mixes plain English messages, code-like messages, `null` returns, and thrown generic errors.

### Recommendation

Adopt one structured error model for action responses.

---

## L8. `createReservation` Performs Extra Notification Lookups After Insert

**File:** `src/lib/actions/reservations.ts:241-282`
**Severity:** Low
**Category:** Performance

### Description

The post-create notification phase performs several follow-up queries that could be reduced or prefetched.

### Recommendation

Reuse data from the mutation query where practical.

---

## L9. Seed Data Uses Inconsistent Email Domains

**Files:** `prisma/seed.ts`, `prisma/seed-data/seed.sql`
**Severity:** Low
**Category:** Maintainability

### Description

The two seed sources use different user email domains.

### Recommendation

Standardize the sample identity set across both seed paths.

---

## L10. Gate Opening Times Are Stored as Plain Strings

**File:** `prisma/schema.prisma:92-101`
**Severity:** Low
**Category:** Data Modeling

### Description

`openTime` and `closeTime` are `String` fields and rely entirely on application discipline.

### Recommendation

Validate format strictly and consider a more specific database representation if the model evolves.

---

## L11. Reservation Item Rows Use Index Keys in Mutable Lists

**Files:** `src/components/reservations/reservation-form-dialog.tsx`, `src/components/reservations/reservation-edit-dialog.tsx`
**Severity:** Low
**Category:** React Correctness

### Description

Both dialogs render reservation items with `key={i}`.

### Impact

When rows are added or removed, React can reuse DOM state for the wrong item.

### Recommendation

Use stable per-item IDs.

---

## L12. Accessibility Labeling Is Incomplete in Complex Forms

**Files:** `src/components/reservations/*`, `src/components/admin/*`
**Severity:** Low
**Category:** Accessibility

### Description

Some basic labels exist already, but several custom table-based and icon-button interactions still rely on visual context rather than explicit accessible names and associations.

### Recommendation

Audit icon buttons, custom inputs, and table-form controls for `aria-label`, `id`, and `htmlFor` coverage.

---

## L13. Admin Delete Flows Have No Confirmation Step

**Files:** `src/components/admin/*`
**Severity:** Low
**Category:** UX / Safety

### Description

Destructive actions appear to execute immediately from the management UI.

### Recommendation

Add a confirmation dialog for destructive operations.

---

## L14. Reservation Form and Edit Dialog Logic Are Heavily Duplicated

**Files:** `src/components/reservations/reservation-form-dialog.tsx`, `src/components/reservations/reservation-edit-dialog.tsx`
**Severity:** Low
**Category:** Maintainability

### Description

The two dialogs duplicate item-list rendering, date/time handling, and related UI behavior.

### Recommendation

Extract shared logic into common helpers or a shared hook.

---

## L15. Prisma Shutdown Handling Is Minimal

**File:** `src/lib/prisma.ts:1-15`
**Severity:** Low
**Category:** Infrastructure

### Description

The module only hooks `beforeExit` for disconnect cleanup.

### Recommendation

Consider explicit signal handling for containerized shutdown paths if operational issues appear.

---

## L16. Docker Images Are Not Patch-Pinned

**File:** `Dockerfile:1-21`
**Severity:** Low
**Category:** Reproducibility

### Description

The Dockerfile uses `node:22-alpine` rather than a patch-pinned tag.

### Recommendation

Pin to a specific patch version if build reproducibility matters.

---

## L17. Local Compose Setup Exposes PostgreSQL on Host Port 5432

**File:** `docker-compose.yml:1-24`
**Severity:** Low
**Category:** Security / Local Ops

### Description

The compose file publishes the database port directly to the host.

### Recommendation

Keep this local-only or bind to localhost explicitly if broader host exposure is unnecessary.

---

## L18. Email Logo Depends on an External Domain

**File:** `src/lib/email.ts:4`
**Severity:** Low
**Category:** Reliability

### Description

Email rendering depends on a logo served from an external website.

### Recommendation

Host the asset under the app's own domain or embed it in a controlled way.

---

## L19. `useState(new Date())` Missing Lazy Initializer

**File:** `src/components/calendar/calendar-page-client.tsx:32`
**Severity:** Low
**Category:** Performance
**Rule:** `rerender-lazy-state-init`

### Description

`useState(new Date())` creates a new `Date` object on every render, though only the first value is used. The correct pattern is `useState(() => new Date())`.

### Impact

Minor — `Date` construction is fast, but the pattern sets a bad precedent for more expensive initializers.

### Recommendation

Use the lazy initializer form: `useState(() => new Date())`.

---

## L20. Conditional Rendering Uses `&&` Instead of Ternary

**Files:** `src/components/auth/login-form.tsx:76`, `src/components/settings/settings-client.tsx:134`, `src/components/settings/settings-client.tsx:205`
**Severity:** Low
**Category:** Correctness
**Rule:** `rendering-conditional-render`

### Description

Several components use `{condition && <Component />}` for conditional rendering. If the condition evaluates to a falsy primitive like `0` or `""`, React renders it as visible text instead of nothing.

### Recommendation

Use `{condition ? <Component /> : null}` for explicit conditional rendering.

---

## L21. No `next/dynamic` Usage Anywhere in the Codebase

**Severity:** Low
**Category:** Performance / Bundle Size
**Rule:** `bundle-dynamic-imports`

### Description

Zero instances of `next/dynamic` or `React.lazy` exist in the project. While the most impactful case (FullCalendar) is tracked separately in H10, this means no route-level code splitting is used at all. As the application grows, heavy admin components and the guide page will increasingly impact initial load.

### Recommendation

Adopt `next/dynamic` as the standard pattern for page-specific heavy components.
