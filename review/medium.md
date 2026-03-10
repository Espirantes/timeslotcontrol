# Medium Findings

Validated on 2026-03-09. Includes original findings plus Vercel React Best Practices audit (M13–M16).

## M1. Server Actions Lack Runtime Input Validation

**Files:** `src/lib/actions/*`
**Severity:** Medium
**Category:** Validation / Security

### Description

Most server actions accept raw strings and numbers and pass them directly into business logic or Prisma calls. Missing checks include:

- malformed dates
- invalid IDs
- unbounded text lengths
- negative or zero numeric values
- invalid `dayOfWeek`, `openTime`, and `closeTime`

### Recommendation

Introduce shared Zod schemas at every action boundary.

---

## M2. `editReservation` Skips the 15-Minute Duration Rule

**File:** `src/lib/actions/reservations.ts:910-1158`
**Severity:** Medium
**Category:** Validation / Consistency

### Description

Creation enforces `durationMinutes % 15 === 0`, but edit paths write `durationMinutes` directly without the same guard.

### Impact

- Reservations can be edited into off-grid durations
- Calendar assumptions become inconsistent between create and edit flows

### Recommendation

Apply the same validation in both create and edit paths via one shared schema.

---

## M3. `isSlotFree` and `isGateOpen` Are Exported Server Actions

**File:** `src/lib/actions/reservations.ts:77-128`
**Severity:** Medium
**Category:** Information Exposure

### Description

Both helpers are exported from a `"use server"` file and perform no auth check.

### Impact

- External callers can probe schedule availability and opening-hour rules
- Internal helper logic is exposed as public server surface

### Recommendation

Make them internal helpers unless they are intentionally part of the API.

---

## M4. No Brute-Force or Rate-Limit Protection on Auth-Sensitive Flows

**Files:** `src/auth.ts`, `src/lib/actions/settings.ts`
**Severity:** Medium
**Category:** Security

### Description

Login and password change rely on bcrypt verification but have no throttling, lockout, or abuse controls.

### Recommendation

Add rate limiting and failure tracking for login and password-change attempts.

---

## M5. `requireSupplierOrWorker` Is Misnamed

**File:** `src/lib/actions/reservations.ts:70-74`
**Severity:** Medium
**Category:** Code Quality / Authorization

### Description

The helper only checks authentication, not supplier-or-worker role membership.

### Impact

- The function name suggests stronger protection than it actually provides
- Future code can inherit incorrect assumptions

### Recommendation

Rename it to reflect reality or implement the role check it claims to perform.

---

## M6. Calendar Queries Miss Overnight Overlaps

**File:** `src/lib/actions/calendar.ts:49-57`, `:101-109`
**Severity:** Medium
**Category:** Correctness

### Description

Calendar queries only fetch reservations whose `startTime` falls inside the requested day. A reservation that starts before midnight and continues into the selected day is omitted.

### Recommendation

Query by interval overlap, not only by `startTime` inclusion.

---

## M7. Cache Revalidation Is Incomplete After Some Mutations

**Files:** `src/lib/actions/reservations.ts`, `src/lib/actions/admin.ts`, `src/lib/actions/notifications.ts`
**Severity:** Medium
**Category:** UX / Consistency

### Description

Some mutations revalidate only detail pages or only partial views. Examples include reservation approval and rejection flows not revalidating the main reservations listing, and notification read-state mutations not revalidating notification-dependent UI.

### Recommendation

Audit revalidation targets per mutation and align them with the affected pages.

---

## M8. Security Headers Are Not Configured

**Files:** `src/middleware.ts`, `next.config.ts`
**Severity:** Medium
**Category:** Security Hardening

### Description

The app does not define standard hardening headers such as CSP, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`.

### Recommendation

Add a baseline header policy in `next.config.ts` and tighten it as needed.

---

## M9. `sendEmail` Logs Failures but Does Not Surface Them

**File:** `src/lib/email.ts:15-30`
**Severity:** Medium
**Category:** Reliability

### Description

When Resend returns a non-OK response, the code logs an error and continues.

### Impact

- Important notification failures are easy to miss
- Callers cannot react or retry intelligently

### Recommendation

Return or throw structured failure information so callers can decide how to handle it.

---

## M10. `getNotifications(limit)` Has No Upper Bound

**File:** `src/lib/actions/notifications.ts:79-92`
**Severity:** Medium
**Category:** Performance / Abuse Resistance

### Description

The caller controls `take` without any clamp.

### Recommendation

Clamp the limit to a safe maximum.

---

## M11. Environment Validation Is Partial

**Files:** `src/lib/prisma.ts`, `src/lib/email.ts`, `docker-compose.yml`
**Severity:** Medium
**Category:** Configuration / Reliability

### Description

`DATABASE_URL` is checked at startup in Prisma setup, but other important environment variables are optional or silently degraded, including email configuration and app URL usage in email templates.

### Recommendation

Add one centralized environment schema and validate required values at startup.

---

## M12. Server Actions Accept Broad Calendar and List Query Shapes

**Files:** `src/lib/actions/calendar.ts`, `src/lib/actions/reservations.ts`
**Severity:** Medium
**Category:** Performance

### Description

The UI currently calls these actions conservatively, but the server actions themselves do not enforce narrow query windows or explicit payload limits.

### Recommendation

Clamp date ranges and keep payload sizes bounded at the action layer, not only in the client.

---

## M13. Sequential Async Waterfalls in Server Actions

**Files:** `src/lib/actions/reservations.ts:216-218`, `:266-272`, `:342-343`, `:400-401`, `:480-482`, `src/lib/actions/calendar.ts:38-100`
**Severity:** Medium
**Category:** Performance
**Rule:** `async-parallel`

### Description

Seven waterfall patterns exist where independent async operations are awaited sequentially instead of with `Promise.all()`.

Confirmed instances:

- `createReservation`: `isGateOpen` and `isSlotFree` run sequentially (lines 216–218)
- `createReservation`: gate, supplier, and worker queries for notifications are sequential (lines 266–272)
- `approveReservation`: `getLocale()` and `getEmailRecipients()` are sequential (lines 342–343)
- `rejectReservation`: same locale + recipients waterfall (lines 400–401)
- `updateReservationStatus`: locale, translations, and recipients are sequential (lines 480–482)
- `getCalendarData`: confirmed and pending reservation queries run sequentially after gates (lines 38–100)
- `getFormData`: gates and transport units are fetched sequentially around conditional client logic (lines 742–763)

### Impact

- Each waterfall adds one full network round-trip latency (50–150 ms per hop)
- Calendar data fetch is ~33% slower than necessary

### Recommendation

Parallelize independent operations with `Promise.all()` and refactor data-fetch ordering so independent queries start together.

---

## M14. Notification Polling Has Race Conditions and No Request Deduplication

**File:** `src/components/layout/notification-bell.tsx:40-85`
**Severity:** Medium
**Category:** Performance / Correctness
**Rule:** `client-swr-dedup`

### Description

The 30-second notification poll uses `setInterval` inside a `useEffect` whose callback depends on `notifyBrowser` and `t`. When the translation object changes reference, the effect cleans up and recreates the interval, potentially producing overlapping in-flight requests. There is no abort controller, stale flag, or SWR-style deduplication.

### Impact

- Parallel `getUnreadCount()` calls can overlap
- Browser notification permission is checked every poll cycle unnecessarily
- Restarting the interval on translation changes is wasted work

### Recommendation

Either use SWR with a polling interval for automatic deduplication, or add an abort controller and stable callback ref to the manual polling implementation.

---

## M15. Derived State Computed via `useEffect` Instead of During Render

**Files:** `src/components/reservations/reservation-form-dialog.tsx:200-209`, `src/components/reservations/reservation-edit-dialog.tsx:77-109`
**Severity:** Medium
**Category:** Performance / Correctness
**Rule:** `rerender-derived-state-no-effect`

### Description

Two form dialogs use `useEffect` to sync derived state from props or other state:

1. `reservation-form-dialog.tsx` computes `duration` from `items` and `transportUnits` inside a `useEffect`, then calls `setDuration()`. This value is fully derivable and should be computed with `useMemo` during render.

2. `reservation-edit-dialog.tsx` re-initializes ~14 state fields from the `reservation` prop inside a `useEffect` triggered by `[open, reservation]`. Every time the reservation object reference changes, all fields are re-set even if data is identical.

### Impact

- Extra render cycles: effect sets state → component re-renders
- Potential flickers when state is momentarily stale before the effect runs

### Recommendation

Derive `duration` with `useMemo` in the form dialog. For the edit dialog, use a component `key` based on `reservation.id` to reset state cleanly, or derive initial values with `useMemo`.

---

## M16. RSC Pages Over-Serialize Data to Client Components

**Files:** `src/app/[locale]/(dashboard)/gates/page.tsx`, `src/app/[locale]/(dashboard)/reservations/[id]/page.tsx`, `src/app/[locale]/(dashboard)/settings/page.tsx`
**Severity:** Medium
**Category:** Performance
**Rule:** `server-serialization`

### Description

Several RSC pages pass full database result objects to client components when only a subset of fields is used:

- Gates page serializes each gate with its full `openingHours` array (7 records per gate × N gates)
- Reservation detail page passes the complete `ReservationListItem` (14+ properties with nested versions) to `ReservationDetailClient`
- Settings page passes the full profile object to `SettingsClient`

### Impact

- Increased HTML payload and RSC response size
- More data serialized, transferred, and deserialized on every navigation

### Recommendation

Map data to minimal shapes before passing across the RSC→client boundary. Only include fields the client component actually reads.
