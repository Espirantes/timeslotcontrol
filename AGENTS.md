# Dock Scheduling System — Agent Context

## What Is This

Warehouse dock scheduling system. Suppliers/carriers request time slots on specific gates (ramps), warehouse workers approve. Built for Mailstep Group.

**GitHub**: https://github.com/Espirantes/dock-scheduling-system

---

## Tech Stack (exact versions matter)

| Layer           | Technology                | Notes                                            |
| --------------- | ------------------------- | ------------------------------------------------ |
| Framework       | **Next.js 16.1**          | App Router, `output: "standalone"`               |
| React           | **React 19**              | RSC + client components                          |
| Language        | **TypeScript 5**          | `strict: true`                                   |
| ORM             | **Prisma 7**              | Client generated to `src/generated/prisma`       |
| Database        | **PostgreSQL 16**         | Local, port 5432, DB: `timeslotcontrol`          |
| Auth            | **Auth.js v5**            | `next-auth@5.0.0-beta.30`, credentials + JWT     |
| CSS             | **Tailwind CSS v4**       | + `shadcn/ui` components in `src/components/ui/` |
| i18n            | **next-intl v4**          | cs, en, it — messages in `messages/`             |
| Calendar        | **@fullcalendar/react 6** | Resource time grid + day grid                    |
| Package manager | **npm**                   | **Never** use pnpm or yarn                       |
| Testing         | **Vitest 4**              | `vitest.config.ts`, path alias `@/` → `src/`     |
| Email           | **Resend API**            | Raw fetch, no SDK package                        |
| Icons           | **lucide-react**          |                                                  |
| Toasts          | **sonner**                |                                                  |

---

## Critical Import Paths

```typescript
// Prisma client — ALWAYS use this import, not @prisma/client
import { PrismaClient } from "@/generated/prisma/client";
import type { UserRole, ReservationStatus, VehicleType } from "@/generated/prisma/client";

// Prisma singleton — use everywhere in server code
import { prisma } from "@/lib/prisma";

// Auth
import { auth } from "@/auth";

// Audit logging — call on EVERY entity mutation
import { auditLog } from "@/lib/audit";

// Email notifications
import { sendEmail, notifyReservationCreated, ... } from "@/lib/email";

// Translations (client components)
import { useTranslations } from "next-intl";

// Translations (server components)
import { getTranslations } from "next-intl/server";
```

---

## Project Structure

```
src/
├── auth.ts                          # NextAuth config (credentials + JWT)
├── middleware.ts                     # next-intl middleware only
├── types/next-auth.d.ts             # Session type augmentation (role, warehouseId, clientId, supplierId)
├── i18n/
│   ├── routing.ts                   # locales: ["cs", "en", "it"], defaultLocale: "cs"
│   └── request.ts                   # next-intl request config
├── lib/
│   ├── prisma.ts                    # PrismaClient singleton (PrismaPg adapter)
│   ├── audit.ts                     # auditLog() helper
│   ├── email.ts                     # Resend API + branded HTML templates
│   ├── utils.ts                     # cn() utility
│   └── actions/
│       ├── reservations.ts          # CRUD, approve/reject, status changes, edit
│       ├── admin.ts                 # warehouses, gates, clients, suppliers, users, transport units
│       ├── calendar.ts              # calendar data + warehouse list
│       ├── notifications.ts         # create, read, mark as read
│       └── settings.ts             # profile, password, notification preferences
├── app/
│   ├── globals.css                  # Tailwind + CSS custom properties (Mailstep theme)
│   ├── layout.tsx                   # Root layout (Inter font)
│   └── [locale]/
│       ├── layout.tsx               # Locale provider
│       ├── page.tsx                 # Redirect to /calendar
│       ├── (auth)/login/            # Login page
│       └── (dashboard)/
│           ├── layout.tsx           # Auth gate + sidebar + header
│           ├── calendar/            # Calendar page (FullCalendar)
│           ├── reservations/        # List + [id] detail
│           ├── warehouses/          # Admin CRUD
│           ├── gates/               # Admin CRUD + opening hours
│           ├── clients/             # Admin CRUD
│           ├── suppliers/           # Admin CRUD
│           ├── users/               # Admin CRUD
│           ├── transport-units/     # Admin CRUD
│           ├── audit-log/           # Admin-only audit viewer
│           ├── settings/            # User profile + preferences
│           └── guide/               # Interactive guide
├── components/
│   ├── ui/                          # shadcn/ui primitives (DO NOT manually edit)
│   ├── layout/
│   │   ├── app-sidebar.tsx          # Navigation sidebar
│   │   ├── app-header.tsx           # Logo + language switcher
│   │   └── notification-bell.tsx    # In-app notification bell
│   ├── admin/                       # Admin CRUD client components
│   ├── calendar/                    # Calendar + reservation popover
│   ├── reservations/                # Form dialog, edit dialog, list, detail
│   ├── settings/                    # Settings client component
│   └── guide/                       # Guide client component
└── hooks/
    └── use-mobile.ts                # Mobile breakpoint hook
```

---

## Routing

`(dashboard)` and `(auth)` are **route groups** — they do NOT add URL segments.

```
src/app/[locale]/(dashboard)/calendar/page.tsx  →  URL: /{locale}/calendar
src/app/[locale]/(dashboard)/reservations/page.tsx  →  URL: /{locale}/reservations
```

Sidebar links use paths WITHOUT `/dashboard` prefix: `/calendar`, `/reservations`, `/warehouses`, etc.

---

## Domain Model

### Core Entities

```
Warehouse 1──N Gates 1──N Reservation
Client 1──N ClientSupplier N──1 Supplier
Reservation ──> Client, Supplier, Gates, User(createdBy)
Reservation ──> confirmedVersion? (ReservationVersion)
Reservation ──> pendingVersion? (ReservationVersion)
Reservation 1──N ReservationVersion (all versions)
ReservationVersion 1──N ReservationItem ──> TransportUnit
```

### Reservation Versioning (Approval Flow)

1. Supplier creates reservation → `status: REQUESTED`, `pendingVersionId` = new version
2. Worker approves → `status: CONFIRMED`, `confirmedVersionId` = that version, `pendingVersionId` = null
3. Supplier edits confirmed reservation → new `pendingVersionId` (confirmed stays as-is)
4. Worker approves/rejects the change

**Key**: `confirmedVersion` = currently active, `pendingVersion` = awaiting approval. Both are optional FK pointing to `ReservationVersion`.

### State Machine

```
REQUESTED → CONFIRMED (worker approves)
REQUESTED → CANCELLED
CONFIRMED → UNLOADING_STARTED (worker)
UNLOADING_STARTED → UNLOADING_COMPLETED (worker)
UNLOADING_COMPLETED → CLOSED (worker)
CONFIRMED → CANCELLED
```

### Visibility Rules

| Role             | Sees                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| ADMIN            | Everything on all warehouses                                         |
| WAREHOUSE_WORKER | Everything on their warehouse                                        |
| CLIENT           | Own + their suppliers' reservations with detail; others = "Occupied" |
| SUPPLIER         | Own reservations only; others = "Occupied"                           |

---

## User Roles & Session

Roles: `ADMIN`, `WAREHOUSE_WORKER`, `CLIENT`, `SUPPLIER`

Session JWT contains:

```typescript
session.user.id; // string
session.user.email; // string
session.user.name; // string
session.user.role; // UserRole
session.user.warehouseId; // string | null (WAREHOUSE_WORKER only)
session.user.clientId; // string | null (CLIENT only)
session.user.supplierId; // string | null (SUPPLIER only)
```

Auth check in server code:

```typescript
const session = await auth();
if (!session) redirect("/login");
```

---

## Database

### Commands

| Script                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `npm run db:setup`    | Create DB + run migrations + seed (safe, skips existing) |
| `npm run db:reset`    | Drop DB, recreate, migrate + seed (**destructive**)      |
| `npm run db:migrate`  | `prisma migrate dev`                                     |
| `npm run db:generate` | `prisma generate`                                        |

### New Migration

```bash
npx prisma migrate dev --name <name>
```

### Prisma Config

`prisma.config.ts` loads env from `.env.local` (not `.env`). Connection uses `PrismaPg` adapter (not the default Prisma engine).

### Seed Data

- Location: `prisma/seed-data/seed.sql`
- All test passwords: `password123`

### Test Accounts

| Email                       | Role             | Organization         |
| --------------------------- | ---------------- | -------------------- |
| admin@timeslotcontrol.com   | ADMIN            | —                    |
| worker@timeslotcontrol.com  | WAREHOUSE_WORKER | Sklad Praha          |
| allegro@timeslotcontrol.com | CLIENT           | Allegro              |
| pg@timeslotcontrol.com      | SUPPLIER         | Procter & Gamble     |
| jarda@jicin.cz              | SUPPLIER         | Jarda z Jicina       |
| alex@nejkafe.cz             | CLIENT           | Online Empire s.r.o. |

### Re-export Seed Data

After adding data via UI:

```bash
PGPASSWORD=postgres pg_dump -U postgres -d timeslotcontrol \
  --data-only --inserts --column-inserts --no-owner --no-privileges \
  --disable-triggers --exclude-table=_prisma_migrations \
  -f prisma/seed-data/dump.sql
```

Then clean into `seed.sql` (remove `\restrict`, SET statements, audit_log and notification rows).

---

## i18n

**MANDATORY**: When adding ANY new UI text, add the translation key to ALL THREE files:

- `messages/cs.json` (Czech — primary)
- `messages/en.json` (English)
- `messages/it.json` (Italian)

Default locale: `cs`. Locales: `["cs", "en", "it"]`.

### Enum Translations

Translation keys for enum values:

- `reservation.status.*` — ReservationStatus
- `reservation.vehicleType.*` — VehicleType
- `user.role.*` — UserRole

---

## Design System — Mailstep Brand

### Colors

| Token        | Value                              | Usage                                        |
| ------------ | ---------------------------------- | -------------------------------------------- |
| Navy         | `#0c1925` / `oklch(0.18 0.04 240)` | Sidebar bg, primary buttons                  |
| Red          | `#db2b19` / `oklch(0.50 0.205 27)` | Accent, active icons, focus ring, header bar |
| Lighter navy | `#1f3947`                          | Sidebar active bg, footer                    |
| Muted text   | `#5a7a8f` / `#8ba4b5`              | Sidebar labels, secondary text               |
| Background   | `#f4f7f9`                          | Page background                              |
| Card         | `#ffffff`                          | Card backgrounds                             |
| Foreground   | `#2d3e50`                          | Body text                                    |
| Border       | `#dae1e5`                          | Borders, dividers                            |

### Typography

Font: **Inter** (weights 300/400/500/600) via `next/font/google`, CSS var `--font-inter`.

### Component Style

- Header: 4px red top bar (`bg-[#db2b19]`), white background
- Sidebar: Dark navy bg, red accent for active items, initials avatar in footer, Mailstep logo at top
- Cards: White bg, subtle border, rounded corners
- Scrollbar: 6px width, subtle grey thumb
- Active sidebar item: lighter navy bg, white text, red icon

---

## Email Notifications

- `src/lib/email.ts` — Resend API via raw fetch (no package)
- Branded HTML template: Mailstep logo header (navy), `#db2b19` red accent bar, navy footer
- Env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
- Triggers: reservation created → workers, approved/rejected → supplier+client, status change → supplier+client

---

## Audit Log

**Always** call `auditLog()` from `src/lib/audit.ts` on every entity mutation:

```typescript
await auditLog({
  entityType: "reservation",  // "gate" | "user" | "warehouse" | ...
  entityId: reservation.id,
  action: "created",          // "updated" | "deleted" | "status_changed" | "version_approved" | ...
  oldData: null,
  newData: { ... },
  userId: session.user.id,
});
```

---

## Server Actions Pattern

All business logic lives in `src/lib/actions/`. Pattern:

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function doSomething(data: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // ... business logic with prisma ...

  await auditLog({ ... });
  revalidatePath("/relevant-path");
  return { success: true };
}
```

---

## Docker

- `Dockerfile`: Multi-stage build (deps → build → runtime), Node 22 Alpine, standalone output
- `docker-compose.yml`: app + PostgreSQL 16 Alpine
- Env vars in compose: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

---

## Testing

- Framework: Vitest 4 with `globals: true`
- Path alias: `@/` → `src/`
- Test files: `src/__tests__/*.test.ts`
- Run: `npm test` (watch) / `npm run test:run` (single run)
- Existing tests: audit, email, i18n, reservations

---

## Rules — DO

- ✅ Use `npm` exclusively
- ✅ Add translations to all 3 locale files (cs, en, it) for every new UI string
- ✅ Call `auditLog()` on every entity mutation
- ✅ Import Prisma types from `@/generated/prisma/client`
- ✅ Use `prisma` singleton from `@/lib/prisma`
- ✅ Use `"use server"` directive in action files
- ✅ Use `auth()` to get session in server code
- ✅ Use `revalidatePath()` after mutations
- ✅ Prefer editing existing files over creating new ones
- ✅ Keep code self-documenting (no obvious comments)
- ✅ After every task, review and update `README.md` and `AGENTS.md` to reflect current project status

## Rules — DO NOT

- ❌ Never use `pnpm` or `yarn`
- ❌ Never import from `@prisma/client` directly — use `@/generated/prisma/client`
- ❌ Never add comments to self-documenting code
- ❌ Never create new files when editing existing ones suffices
- ❌ Never add error handling for impossible scenarios
- ❌ Never use `--no-verify`, `--force-push` or other bypasses
- ❌ Never commit `.env` files or secrets
- ❌ Never forget to add translations to all 3 languages
- ❌ Never add `/dashboard` prefix to URLs (route groups don't add segments)

---

## Completed Features

- Reservation CRUD (create, edit, approve/reject, status transitions)
- Calendar view (FullCalendar, date click → create, event popover)
- Reservation detail page with version diff and status buttons
- Admin CRUD: warehouses, gates + opening hours, clients, suppliers, users, transport units
- Email notifications (Resend, Mailstep branded HTML, per-user preferences)
- i18n (cs/en/it, all hardcoded strings replaced with `useTranslations`)
- In-app notifications (bell, popover, 30s polling, browser push)
- Audit log (admin page with filtering and pagination)
- User settings (profile, password change, notification preferences)
- DB seed with test data
- Interactive guide for new users
- Docker (multi-stage Dockerfile + docker-compose)
- Vitest unit tests

## TODO

1. Role-based visibility — test all 4 roles in UI
2. Production deployment — env variables, CI/CD pipeline
