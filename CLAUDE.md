# Dock Scheduling System — Claude Code Context

## Původní zadání

Rezervační systém slotů pro sklady. Dopravce/dodavatel žádá o časový slot na konkrétní rampu (gate), pracovník skladu schvaluje.

### Sklady a rampy
- Fyzické sklady s rampami (gates)
- Každá rampa má nastavitelné otevírací hodiny (admin), kapacita = 1 vozidlo najednou
- Minimální slot: 15 minut + násobky

### Rezervace
- Supplier vytvoří → Worker schválí (approval flow)
- Jakákoli změna potvrzené rezervace vyžaduje nové schválení — poslední schválená verze vždy platná
- Data: typ vozidla, SPZ, plomby, jméno + kontakt řidiče, poznámky
- Přepravní jednotky: palety EUR, palety jednocestné, kartony (množství, hmotnost kg, popis)

### Stavy rezervace
```
REQUESTED → CONFIRMED → UNLOADING_STARTED → UNLOADING_COMPLETED → CLOSED
REQUESTED → CANCELLED
CONFIRMED → CANCELLED
```

### Entity a vztahy
- Supplier ↔ Client = M:N (supplier patří pod více klientů)
- Supplier vždy vytváří rezervaci ve vztahu ke konkrétnímu klientovi
- Client vidí detail rezervací všech svých supplierů; cizí = "Obsazeno"
- Supplieři navzájem rezervace nevidí

### Role
| Role | Přístup |
|------|---------|
| ADMIN | Vše na všech skladech, správa entit |
| WAREHOUSE_WORKER | Vše na svém skladu, schvaluje, mění stavy |
| CLIENT | Své + child supplier rezervace; cizí = "Obsazeno" |
| SUPPLIER | Jen své rezervace; cizí = "Obsazeno" |

### Ostatní požadavky
- Notifikace emailem (Resend API)
- Jazyky: čeština, angličtina, italština
- Auth: credentials (SSO časem)
- Lokální PostgreSQL, bez Supabase/Vercel

---

## Projekt

GitHub: https://github.com/Espirantes/dock-scheduling-system

---

## Tech stack

- **Next.js 16** (App Router, `[locale]` i18n routing přes `next-intl`)
- **React 19**, TypeScript
- **Prisma 7** — ORM, klient generován do `src/generated/prisma`
  - Import: `import { PrismaClient } from "@/generated/prisma/client"`
  - Singleton: `import { prisma } from "@/lib/prisma"`
- **PostgreSQL** lokálně (port 5432, DB: `timeslotcontrol`)
- **Auth.js v5** (`next-auth@beta`) — credentials + JWT sessions
- **Tailwind CSS v4** + shadcn/ui komponenty v `src/components/ui/`
- **next-intl v4** — cs, en, it (messages v `messages/`)
- **@fullcalendar/react** — kalendářní pohled
- **pnpm** jako package manager (ne npm, ne yarn)

---

## Databáze

### Prvotní setup na novém PC
```bash
# 1. Nainstaluj PostgreSQL (uživatel postgres, heslo postgres)
# 2. Nainstaluj závislosti
pnpm install
# 3. Zkopíruj .env.local
cp .env.local.example .env.local
# 4. Uprav DATABASE_URL v .env.local pokud se liší credentials/port
# 5. Spusť setup — vytvoří DB, migrace, seed data
pnpm db:setup
# 6. Spusť dev server
pnpm dev
```

### Dostupné skripty
| Skript | Popis |
|--------|-------|
| `pnpm db:setup` | Vytvoří DB + migrace + seed (bezpečné, přeskočí existující data) |
| `pnpm db:reset` | Smaže DB, znovu vytvoří, migrace + seed (destruktivní) |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:generate` | `prisma generate` |

### Seed data
- Umístění: `prisma/seed-data/seed.sql`
- Obsahuje: sklady, rampy, klienty, dodavatele, uživatele, rezervace
- Všechna testovací hesla: `password123`

### Testovací účty
| Email | Role | Organizace |
|-------|------|------------|
| admin@timeslotcontrol.com | ADMIN | — |
| worker@timeslotcontrol.com | WAREHOUSE_WORKER | Sklad Praha |
| allegro@timeslotcontrol.com | CLIENT | Allegro |
| pg@timeslotcontrol.com | SUPPLIER | Procter & Gamble |
| jarda@jicin.cz | SUPPLIER | Jarda z Jicina |
| alex@nejkafe.cz | CLIENT | Online Empire s.r.o. |

### Re-export dat z lokální DB
Po přidání nových dat v UI, exportuj aktuální stav:
```bash
PGPASSWORD=postgres pg_dump -U postgres -d timeslotcontrol \
  --data-only --inserts --column-inserts --no-owner --no-privileges \
  --disable-triggers --exclude-table=_prisma_migrations \
  -f prisma/seed-data/dump.sql
```
Pak vyčisti do `seed.sql` (odebrat `\restrict`, SET příkazy, audit_log a notification záznamy).

### Prisma
- Migrace: `pnpm prisma migrate dev --name <nazev>`
- Generování klienta: `pnpm prisma generate`
- Config: `prisma.config.ts` — načítá `.env.local`

---

## Doménový model

- **Warehouse** — fyzický sklad, má N gates
- **Gates** — vstupní brána, má otevírací hodiny, kapacita = 1 vozidlo najednou
- **Client** — přímý klient skladu (parent)
- **Supplier** — dodavatel/dopravce, M:N vazba s Client
- **Reservation** — obsahuje `confirmedVersionId` + `pendingVersionId`
- **ReservationVersion** — verzovaná data (čas, vozidlo, řidič, plomby...)
- **ReservationItem** — řádky přepravních jednotek
- **AuditLog** — každá změna logována

### Approval flow
1. Supplier vytvoří → `status: REQUESTED`, `pendingVersionId` = nová verze
2. Worker schválí → `status: CONFIRMED`, `confirmedVersionId` = verze
3. Supplier změní confirmed → nová `pendingVersionId` (confirmed zůstává platná)
4. Worker schválí/zamítne změnu

### Viditelnost
- Supplier: jen své rezervace s detailem; cizí = "Obsazeno"
- Client: detail svých + všech svých suppliers; ostatní = "Obsazeno"
- Warehouse Worker: vše na svém skladu
- Admin: vše na všech skladech

---

## Uživatelské role

- `ADMIN` — všechny sklady, správa entit
- `WAREHOUSE_WORKER` — per sklad, schvaluje rezervace, mění stavy
- `CLIENT` — vidí své + child rezervace
- `SUPPLIER` — vidí jen své rezervace

Uloženo v JWT: `session.user.role`, `warehouseId`, `clientId`, `supplierId`

---

## Klíčové soubory

- Auth config: `src/auth.ts`
- Prisma singleton: `src/lib/prisma.ts`
- Audit helper: `src/lib/audit.ts`
- i18n routing: `src/i18n/routing.ts`
- i18n request: `src/i18n/request.ts`
- Middleware: `src/middleware.ts`
- Dashboard layout (auth gate): `src/app/[locale]/(dashboard)/layout.tsx`
- Sidebar: `src/components/layout/app-sidebar.tsx`
- Messages: `messages/cs.json`, `messages/en.json`, `messages/it.json`
- Typy session: `src/types/next-auth.d.ts`

---

## Stavový automat rezervace

```
REQUESTED → CONFIRMED (schválení workerem)
REQUESTED → CANCELLED
CONFIRMED → UNLOADING_STARTED (worker)
UNLOADING_STARTED → UNLOADING_COMPLETED (worker)
UNLOADING_COMPLETED → CLOSED (worker)
CONFIRMED → CANCELLED
```

---

## i18n

Při přidávání jakékoli nové UI kopie je nutné přidat klíč do **všech tří** souborů:
- `messages/cs.json`
- `messages/en.json`
- `messages/it.json`

---

## Překlady — enum hodnoty

Překlady enums jsou v JSON klíčích:
- `reservation.status.*` — ReservationStatus
- `reservation.vehicleType.*` — VehicleType
- `reservation.unitType.*` — TransportUnitType
- `user.role.*` — UserRole

---

## Email (Resend)

- Resend API (fetch, bez package — stejně jako ClearData)
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

---

## Audit log

Vždy volej `auditLog()` z `src/lib/audit.ts` při každé změně entity.

---

## Co nedělat

- ❌ Nepoužívej `npm` nebo `yarn` — vždy `pnpm`
- ❌ Nepřidávej komentáře k samopopisnému kódu
- ❌ Nevytvářej nové soubory pokud stačí upravit existující
- ❌ Nepřidávej error handling pro scénáře které nemohou nastat
- ❌ Nepoužívej `--no-verify`, `--force-push` ani jiné bypassy
- ❌ Necommituj `.env` soubory ani secrets
- ❌ Nezapomeň přidat překlady do všech tří jazyků

---

## Design systém (aktuální)

- Font: **Inter** (300/400/500/600) via `next/font/google`, var `--font-inter`
- Barvy: `slate-50` bg, `white` karty, `slate-900` primary button, `indigo-600` accent + focus ring
- Sidebar: `slate-50` bg, aktivní item = `bg-white shadow-sm border`, ikony `indigo-600` aktivní
- Scrollbar: 6px, `slate-200` thumb

---

## Routing

`(dashboard)` a `(auth)` jsou **route groups** — nepřidávají segment do URL.
- `src/app/[locale]/(dashboard)/calendar/page.tsx` → URL: `/{locale}/calendar`
- Sidebar linky: `/calendar`, `/reservations`, `/warehouses` atd. (BEZ `/dashboard` prefixu)

---

## Email notifikace

- `src/lib/email.ts` — Resend API via fetch (bez package)
- Branded HTML šablona: Mailstep logo, `#db2b19` red accent, navy header/footer
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
- Notifikace: created → workers, approved/rejected → supplier+client, status change → supplier+client

---

## Hotovo

- ✅ `ReservationFormDialog` — gate/čas/vozidlo/přepravní jednotky, `createReservation` action
- ✅ `approveReservation`, `rejectReservation`, `updateReservationStatus`, `getReservationList`
- ✅ `ReservationsListClient` — taby Ke schválení / Všechny, inline approve/reject
- ✅ `CalendarView` — `dateClick` otvírá dialog, tlačítko "Nová rezervace"
- ✅ Design system — Inter font, slate/indigo CSS vars, custom scrollbar, sidebar restyle
- ✅ FIX 404 — příčina: `/dashboard` prefix v URL (route group nepřidává segment)
- ✅ Detail rezervace — `/reservations/[id]` + stavová tlačítka + version diff
- ✅ Admin CRUD — warehouses, gates + opening hours, users, clients, suppliers
- ✅ Email notifikace — Resend API, Mailstep branded HTML, preference per uživatel
- ✅ i18n — hardcoded CS stringy nahrazeny `useTranslations`, EN + IT kompletní
- ✅ In-app notifikace — zvoneček, popover, polling 30s, browser push
- ✅ Audit log — admin-only stránka s filtrováním a paginací
- ✅ Notifikační preference — email/in-app/browser přepínače v nastavení
- ✅ DB seed — `prisma/seed-data/seed.sql` + `pnpm db:setup` / `pnpm db:reset`

## TODO (zbývá)

1. **Role-based visibility** — otestovat všechny 4 role v UI
2. **Deployment** — Docker/Vercel setup, env variables
