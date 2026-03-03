# Next.js + React Code Review

Date: 2026-03-03  
Scope: App Router architecture, RSC/client boundaries, data-fetching patterns, i18n consistency, rendering/performance patterns, and UI composition based on `next-best-practices` + `vercel-react-best-practices`.

## Executive Summary

The codebase has a solid core architecture (App Router, server actions, auth checks, Prisma singleton usage, and generally clean separation of responsibilities). The biggest issues are around i18n consistency, locale-aware routing/formatting, image optimization, and several React ergonomics/performance hotspots.

**Overall assessment:** Good foundation, but **not yet production-hardened** for multilingual UX and framework best-practice compliance.

- Critical issues: 1
- High issues: 6
- Medium issues: 5
- Low issues: 4

---

## What’s Strong

- Clear App Router structure and route grouping under `[locale]`.
- Good use of server actions for business logic (`src/lib/actions/*`).
- Proper auth gating in dashboard routes and actions.
- Frequent use of `Promise.all` in admin pages to reduce obvious waterfalls.
- Consistent use of `useTransition` for async UI actions in client components.

---

## Findings (Prioritized)

## 1) CRITICAL

### C1 — i18n contract is broken by hard-coded UI strings

**Why this matters (Next.js + React):** You use `next-intl`, but multiple user-facing strings bypass translation keys. This causes mixed-language UX and breaks locale parity.

**Evidence:**

- `src/app/[locale]/(dashboard)/calendar/page.tsx` (`"Kalendář"`, `"Nejsou k dispozici žádné sklady."`, `"Kalendář rezervací"`)
- `src/app/[locale]/(dashboard)/reservations/page.tsx` (`"Rezervace"`)
- `src/components/calendar/calendar-page-client.tsx` (`"Sklad:"`)
- `src/components/calendar/calendar-view.tsx` (`"Dnes"`)
- `src/components/admin/gates-client.tsx` (label/header `"Sklad"`)
- Server-generated display strings in `src/lib/actions/calendar.ts` (`"Obsazeno"`, `"Čeká na schválení"`)

**Recommendation:**

- Move all user-visible text to `messages/cs.json`, `messages/en.json`, `messages/it.json`.
- For server action display strings, return semantic status/type and translate in UI.

---

## 2) HIGH

### H1 — `<img>` used instead of `next/image`

**Why this matters:** Misses Next.js image optimization (layout stability, responsive sizing, lazy loading).

**Evidence:**

- `src/components/layout/app-header.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/components/auth/login-form.tsx`

**Recommendation:** Replace `<img>` with `next/image` for static assets.

### H2 — Locale can be lost on navigation

**Why this matters:** Locale-specific routes under `[locale]` can regress to default locale when pushing to `"/calendar"`, `"/reservations"`, etc.

**Evidence:**

- `src/components/auth/login-form.tsx` → `router.push("/calendar")`
- `src/components/reservations/reservation-detail-client.tsx` → `router.push("/reservations")`
- `src/components/layout/app-sidebar.tsx` links like `href="/settings"`, `href="/guide"`, `href="/audit-log"`

**Recommendation:**

- Use locale-aware navigation helpers from `next-intl/navigation` (`Link`, `useRouter`, `usePathname`) to preserve active locale.

### H3 — Date/time formatting is hard-coded to Czech locale

**Why this matters:** Users with `en`/`it` still see Czech-formatted dates and calendar locale.

**Evidence:**

- `src/components/calendar/calendar-view.tsx` (`locale="cs"`, `date-fns` `cs` locale)
- `src/components/reservations/reservation-detail-client.tsx` (date-fns `cs`)
- `src/components/reservations/reservations-list-client.tsx` (date-fns `cs`)
- `src/components/settings/settings-client.tsx` (date-fns `cs`)
- `src/components/admin/audit-log-client.tsx` (date-fns `cs`)
- `src/lib/actions/reservations.ts` and `src/lib/email.ts` (`toLocaleString("cs-CZ")`)

**Recommendation:**

- Derive locale from `next-intl` and map to `date-fns`/FullCalendar locale adapters.
- Avoid locale-specific formatting in server actions where possible.

### H4 — Missing route-level error/loading/not-found boundaries

**Why this matters:** App Router best practice is explicit segment error/loading handling for resilience and perceived performance.

**Evidence:** No files found for:

- `src/app/**/error.tsx`
- `src/app/**/loading.tsx`
- `src/app/**/not-found.tsx`

**Recommendation:** Add minimal boundaries at least for dashboard segments and detail routes.

### H5 — Duplicate auth checks across pages + actions

**Why this matters:** Many pages call `auth()` and then invoke actions that call `auth()` again. This adds avoidable overhead and can complicate future caching.

**Evidence:**

- `src/app/[locale]/(dashboard)/users/page.tsx` + `src/lib/actions/admin.ts`
- Similar pattern in `gates/page.tsx`, `clients/page.tsx`, `suppliers/page.tsx`, `warehouses/page.tsx`

**Recommendation:**

- Keep authorization in one layer for read flows (prefer actions), or use direct Prisma in RSC pages after one auth check.

### H6 — Hard-coded color tokens spread through components

**Why this matters:** Creates maintenance drift and weakens theme consistency.

**Evidence (sample):**

- `src/app/[locale]/(dashboard)/layout.tsx`
- `src/components/layout/app-header.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/notification-bell.tsx`
- `src/components/guide/guide-client.tsx`
- `src/components/calendar/calendar-view.tsx`

**Recommendation:**

- Move repeated color values into semantic Tailwind/theme tokens and reuse utility classes.

---

## 3) MEDIUM

### M1 — React key warning risk in list rendering

**Evidence:** `src/components/admin/gates-client.tsx` uses `<>...</>` within `.map()` with no key on the fragment.

**Impact:** Potential reconciliation issues and console warnings.

**Recommendation:** Use `<React.Fragment key={g.id}>`.

### M2 — Potential race conditions in client data loading

**Evidence:**

- `src/components/calendar/calendar-page-client.tsx` uses async `loadData` in `useEffect` without cancellation/race guard.
- `src/components/reservations/reservation-form-dialog.tsx` and `reservation-edit-dialog.tsx` load async form data on open without stale-request protection.

**Impact:** Fast user interactions can show outdated data.

**Recommendation:** Use request versioning or `AbortController`-style cancellation guard.

### M3 — Notification polling continues regardless of tab visibility

**Evidence:** `src/components/layout/notification-bell.tsx` polls every 30s continuously.

**Impact:** Unnecessary server load and battery/network use.

**Recommendation:** Pause/reduce polling when document is hidden; optionally backoff strategy.

### M4 — Mixed localization responsibilities in server actions

**Evidence:** `src/lib/actions/calendar.ts` builds localized display titles (`"Obsazeno"`, `"(čeká)"`) in backend response.

**Impact:** Backend becomes language-coupled; hard to support runtime locale switches.

**Recommendation:** Return semantic fields (`visibility: OCCUPIED`, `state: PENDING`) and localize in client.

### M5 — Login and dashboard visual texts partly bypass translation

**Evidence:**

- `src/components/auth/login-form.tsx` includes static `"Dock Scheduling System"`.

**Impact:** Incomplete localization polish.

**Recommendation:** Move to translation files.

---

## 4) LOW

### L1 — Some memoization opportunities in heavy render paths

**Evidence:** Calendar resource/event mappings are recreated each render in `src/components/calendar/calendar-view.tsx`.

**Recommendation:** Memoize derived arrays if re-render frequency increases (profile first).

### L2 — Server action return typing can be stricter

**Evidence:** Several actions return loosely shaped success objects.

**Recommendation:** Use explicit shared return types for stronger client-side inference.

### L3 — Minor dead/unclear local variable in edit dialog

**Evidence:** `selectedGate` in `src/components/reservations/reservation-edit-dialog.tsx` compares gate id to `reservation.warehouseId` and is unused.

**Recommendation:** Remove or fix intent.

### L4 — Segment metadata is minimal and static

**Evidence:** Only `src/app/[locale]/layout.tsx` defines metadata.

**Recommendation:** Add route-level metadata (`generateMetadata`) for major pages if SEO/internal discoverability matters.

---

## Remediation Roadmap

### Phase 1 (highest ROI, low risk)

1. Replace all `<img>` with `next/image`.
2. Remove hard-coded Czech strings in dashboard/components and move to translation files (all 3 locales).
3. Make date/calendar locale dynamic via active locale.
4. Fix fragment keys in `gates-client`.

### Phase 2

1. Introduce locale-aware navigation helpers from `next-intl/navigation`.
2. Add `error.tsx` + `loading.tsx` in key route segments.
3. Refactor backend display strings to semantic enums.

### Phase 3

1. Add polling visibility/backoff control.
2. Add request cancellation guards for async client data loaders.
3. Reduce duplicated auth checks in page+action read paths.

---

## Final Verdict

The project is structurally solid and close to high quality, but multilingual correctness and framework-aligned UX consistency need focused cleanup. Addressing the Phase 1 items will remove most user-visible issues and bring the app much closer to Next.js/React best-practice standards.
