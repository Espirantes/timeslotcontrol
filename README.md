# Dock Scheduling System

Warehouse dock scheduling system for managing time slots on loading/unloading gates. Suppliers request slots, warehouse workers approve them.

Built for **Mailstep Group**.

## Features

- **Calendar view** -- interactive weekly calendar with drag & click reservation creation (FullCalendar)
- **Reservation workflow** -- REQUESTED > CONFIRMED > UNLOADING_STARTED > UNLOADING_COMPLETED > CLOSED
- **Approval flow** -- any change to a confirmed reservation requires re-approval (versioning system)
- **Role-based access** -- Admin, Warehouse Worker, Client, Supplier (each sees only what they should)
- **Gate opening hours** -- configurable per day of week, blocks out-of-hours reservations
- **Notifications** -- email (Resend), in-app (bell icon with polling), browser push (Web Notification API)
- **Notification preferences** -- each user can toggle email / in-app / browser notifications
- **Audit log** -- full change history with JSON diffs, filterable by entity type
- **i18n** -- Czech, English, Italian
- **Admin panel** -- CRUD for warehouses, gates, clients, suppliers, users, transport units

## Tech Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 16 (App Router)                          |
| Frontend        | React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| ORM             | Prisma 7                                         |
| Database        | PostgreSQL                                       |
| Auth            | Auth.js v5 (credentials + JWT)                   |
| i18n            | next-intl v4 (cs, en, it)                        |
| Calendar        | @fullcalendar/react                              |
| Email           | Resend API                                       |
| Package manager | npm                                              |

## Quick Start

### Prerequisites

- Node.js 20+
- npm (included with Node.js)
- PostgreSQL running locally (user: `postgres`, password: `postgres`)

### Setup

```bash
git clone <repo-url>
cd timeslotcontrol
npm install
cp .env.local.example .env.local   # edit if your DB credentials differ
npm run db:setup                    # creates DB, runs migrations, seeds data
npm run dev                         # http://localhost:3000
```

### Reset database

```bash
npm run db:reset   # drops DB, recreates, migrates, seeds
```

## Test Accounts

All passwords: `password123`

| Email                       | Role             | Organization         |
| --------------------------- | ---------------- | -------------------- |
| admin@timeslotcontrol.com   | Admin            | --                   |
| worker@timeslotcontrol.com  | Warehouse Worker | Sklad Praha          |
| allegro@timeslotcontrol.com | Client           | Allegro              |
| pg@timeslotcontrol.com      | Supplier         | Procter & Gamble     |
| jarda@jicin.cz              | Supplier         | Jarda z Jicina       |
| alex@nejkafe.cz             | Client           | Online Empire s.r.o. |

## Scripts

| Command               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Start dev server                                        |
| `npm run build`       | Production build                                        |
| `npm run db:setup`    | Create DB + migrate + seed (safe, skips if data exists) |
| `npm run db:reset`    | Drop & recreate DB + migrate + seed                     |
| `npm run db:migrate`  | Run Prisma migrations                                   |
| `npm run db:generate` | Regenerate Prisma client                                |
| `npm run lint`        | ESLint                                                  |
| `npm run typecheck`   | TypeScript check                                        |
| `npm test`            | Run tests (vitest)                                      |

## Project Structure

```
src/
  app/[locale]/
    (auth)/login/         # Login page
    (dashboard)/          # Authenticated pages
      calendar/           # Calendar view
      reservations/       # List + detail
      settings/           # User profile + notification preferences
      audit-log/          # Admin-only audit log
      warehouses/         # Admin CRUD
      gates/              # Admin CRUD
      clients/            # Admin CRUD
      suppliers/          # Admin CRUD
      users/              # Admin CRUD
      transport-units/    # Admin CRUD
  components/
    layout/               # Sidebar, header, notification bell
    calendar/             # Calendar + popover
    reservations/         # List, detail, form, edit dialog
    settings/             # Settings client component
    admin/                # Users, audit log client components
    ui/                   # shadcn/ui primitives
  lib/
    actions/              # Server actions (reservations, admin, notifications, settings)
    prisma.ts             # Prisma singleton
    email.ts              # Resend email templates
    audit.ts              # Audit log helper
  i18n/                   # next-intl config
messages/                 # cs.json, en.json, it.json
prisma/
  schema.prisma           # Database schema
  seed-data/seed.sql      # Seed data for local development
scripts/
  db-setup.sh             # Database setup script
  db-reset.sh             # Database reset script
```

## Environment Variables

See [.env.local.example](.env.local.example):

| Variable              | Required | Description                                              |
| --------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                             |
| `AUTH_SECRET`         | Yes      | Random string for session encryption                     |
| `RESEND_API_KEY`      | No       | Resend API key for email notifications                   |
| `RESEND_FROM_EMAIL`   | No       | Sender email address                                     |
| `NEXT_PUBLIC_APP_URL` | No       | App URL for email links (default: http://localhost:3000) |

## License

Private / Proprietary -- Mailstep Group
