# High Findings

Validated on 2026-03-09. Includes original findings plus Vercel React Best Practices audit (H10–H13).

## H1. Exported Notification Mutation Lacks Auth Guard

**File:** `src/lib/actions/notifications.ts:24-63`
**Severity:** High
**Category:** Authentication / Authorization

### Description

`createNotificationsForEvent` is exported from a `"use server"` module but does not call the local auth helper used elsewhere in the file.

### Impact

- Internal notification plumbing is exposed as a callable server action
- The endpoint accepts user-targeting inputs such as `warehouseId`, `clientId`, and `supplierId`
- This unnecessarily expands the mutation surface area

### Recommendation

Make the function private to the module or add explicit authentication and authorization checks.

---

## H2. `createUser` Returns the Stored Password Hash

**File:** `src/lib/actions/admin.ts:230-256`
**Severity:** High
**Category:** Information Disclosure

### Description

`createUser()` hashes the password and returns the full Prisma user object. That response includes the hashed password field.

### Impact

- Credential hashes are exposed to the browser and network tooling
- This breaks basic secret-minimization expectations

### Recommendation

Return a selected subset of fields or strip the `password` property before returning.

---

## H3. JWT Claims Become Stale After Login

**File:** `src/auth.ts:43-70`
**Severity:** High
**Category:** Authentication / Session Management

### Description

Role and scope information are copied into the JWT only when `user` is present in the callback. The app uses JWT sessions, so deactivation, role changes, and warehouse reassignment do not take effect immediately for active sessions.

### Impact

- Demoted or deactivated users can keep working until their token expires
- Warehouse reassignment does not reliably tighten access in real time
- This compounds authorization bugs that rely on `warehouseIds`, `clientId`, or `supplierId`

### Recommendation

Refresh claims from the database periodically in the JWT callback, or switch to database-backed sessions.

---

## H4. Multi-Step Mutations Are Not Atomic

**Files:** `src/lib/actions/reservations.ts`, `src/lib/actions/admin.ts`
**Severity:** High
**Category:** Data Integrity

### Description

Several flows span multiple writes without a single transaction covering the full business change.

Confirmed examples:

- reservation create, approve, reject, status update, and edit flows
- `updateSupplier`
- `updateUser` warehouse assignment sync

Nested creates are used in part of the reservation create flow, but pointer updates, audit entries, and status history writes still happen outside one atomic unit.

### Impact

- Partial writes can leave reservation state, status history, and audit records out of sync
- Supplier and warehouse assignment updates can be left half-applied

### Recommendation

Wrap each business operation in one transaction and perform emails or notifications only after commit.

---

## H5. Email Templates Interpolate Unescaped User Content

**File:** `src/lib/email.ts:156-178`
**Severity:** High
**Category:** Security / Injection

### Description

Email HTML is assembled by injecting `title`, `body`, and `value` strings directly into HTML without escaping.

### Impact

- Stored HTML from names or notes can appear in outbound emails
- This enables phishing-style content injection and unsafe rendering in permissive mail clients

### Recommendation

Escape all dynamic HTML fields before interpolation.

---

## H6. Hard Deletes Can Produce Inconsistent Authorization State

**File:** `src/lib/actions/admin.ts`
**Severity:** High
**Category:** Data Integrity / Authorization

### Description

Warehouse, gate, client, and supplier deletions are hard deletes. Because user relations use nullable foreign keys in some places, deleting a client or supplier can leave role-bearing users with missing scope data.

### Impact

- Historical data becomes harder to preserve consistently
- Scoped users can be left in an invalid state that interacts badly with the access-control bugs above

### Recommendation

Use soft deletes for business entities that participate in authorization or historical workflows.

---

## H7. Authentication Is Enforced Decentrally Rather Than by Secure Default

**File:** `src/middleware.ts:1-7`
**Severity:** High
**Category:** Security Architecture

### Description

The middleware only applies `next-intl` routing. Authentication is enforced later in layout code and individual actions.

### Impact

- New pages and actions are easy to add without a consistent auth gate
- Security review depends on every entrypoint remembering to enforce auth manually

### Recommendation

Keep page-level checks, but add a central defensive layer where possible so the default is deny, not allow.

---

## H8. Core Reservation Flows Lack Direct Test Coverage

**Files:** `src/__tests__/reservations.test.ts`, `src/__tests__/notifications.test.ts`, `src/__tests__/admin.test.ts`
**Severity:** High
**Category:** Quality / Reliability

### Description

The existing suite is not empty and currently passes, but it mostly covers helpers and selected query shapes. The highest-risk reservation workflows still have no direct tests.

Missing direct tests include:

- `createReservation`
- `approveReservation`
- `rejectReservation`
- `updateReservationStatus`
- `editReservation`
- scoped access edge cases with missing `warehouseIds`, `clientId`, or `supplierId`

### Impact

- The most dangerous regressions are not guarded by tests
- The confirmed authorization and scheduling bugs were able to survive despite a green suite

### Recommendation

Add integration-style action tests around reservation writes and role-scoping edge cases first.

---

## H9. Local Deployment Secrets and Auth Env Names Need Hardening

**File:** `docker-compose.yml:1-24`
**Severity:** High
**Category:** Configuration / Security

### Description

`docker-compose.yml` hardcodes local credentials and still uses `NEXTAUTH_URL` / `NEXTAUTH_SECRET` naming even though the project is on Auth.js v5.

### Impact

- Unsafe defaults can leak into non-local deployments
- Configuration drift makes auth setup easier to misconfigure

### Recommendation

Move secrets into environment files or secret management, and standardize on the expected Auth.js v5 environment variables.

---

## H10. FullCalendar Loaded Eagerly Without Dynamic Import

**Files:** `src/components/calendar/calendar-view.tsx:3-9`, `src/components/calendar/calendar-page-client.tsx:7`
**Severity:** High
**Category:** Performance / Bundle Size
**Rule:** `bundle-dynamic-imports`

### Description

All seven `@fullcalendar/*` packages (~300–400 KB) are statically imported and included in the shared JavaScript bundle. They are only needed on the `/calendar` route, but every page (admin, settings, audit log, reservations list) pays the cost.

No usage of `next/dynamic` or `React.lazy` exists anywhere in the codebase.

### Impact

- 300–400 KB of calendar code shipped to every page
- Higher Time to Interactive and Largest Contentful Paint on non-calendar routes
- Slower JavaScript evaluation on low-end devices

### Recommendation

Wrap `CalendarView` in `next/dynamic({ ssr: false })` from `calendar-page-client.tsx` so the FullCalendar bundle is only downloaded when the calendar page is visited.

---

## H11. Missing `optimizePackageImports` for Barrel-Heavy Libraries

**File:** `next.config.ts`
**Severity:** High
**Category:** Performance / Bundle Size
**Rule:** `bundle-barrel-imports`

### Description

All 26 component files import from the `lucide-react` barrel entry point. The project also uses `date-fns` and `sonner` which have similar barrel structures. `next.config.ts` does not configure `optimizePackageImports`, so the bundler cannot automatically tree-shake these imports at build time.

### Impact

- lucide-react barrel can pull in the full icon set (~676 KB source) during dev, slowing HMR and cold starts
- Production builds must analyze the full module graph for tree shaking

### Recommendation

Add `optimizePackageImports` to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  optimizePackageImports: ["lucide-react", "date-fns"],
};
```

---

## H12. Email and Notification Side Effects Block Server Action Responses

**Files:** `src/lib/actions/reservations.ts:253-283`, `:331-370`, `:509-571`, `:1060-1158`
**Severity:** High
**Category:** Performance
**Rule:** `server-after-nonblocking`

### Description

Every reservation mutation (`createReservation`, `approveReservation`, `rejectReservation`, `updateReservationStatus`, `editReservation`) performs email sends, audit log writes, notification creation, and several follow-up queries synchronously before returning the response. The Resend API call alone can add 400–800 ms.

### Impact

- User-perceived latency for reservation actions is 600 ms–1.2 s longer than necessary
- The core mutation has already committed; there is no functional reason to block on side effects

### Recommendation

Use `after()` from `next/server` to schedule email, notification, and non-critical audit work after the response is sent:

```typescript
import { after } from "next/server";

// After the core mutation and revalidation:
after(async () => {
  await auditLog({ ... });
  await notifyReservationCreated({ ... });
  await createNotificationsForEvent({ ... });
});

return { success: true, reservationId };
```

---

## H13. No Per-Request Deduplication for `auth()` Calls

**Files:** `src/app/[locale]/(dashboard)/*/page.tsx`, `src/lib/actions/*.ts`
**Severity:** High
**Category:** Performance
**Rule:** `server-cache-react`

### Description

Every page-level server component calls `auth()` for the redirect guard, then the server action it invokes (e.g. `getReservationList`, `getCalendarData`) calls `auth()` again internally. These are separate database round-trips within the same request.

### Impact

- 2+ redundant DB queries per page render on every request
- Auth overhead doubles for pages that call multiple server actions

### Recommendation

Wrap `auth()` in `React.cache()` to deduplicate within a single server request:

```typescript
import { cache } from "react";
import { auth } from "@/auth";

export const getCachedSession = cache(async () => {
  return await auth();
});
```
