# TimeSlotControl — Claude Code Context

## Projekt

Rezervační systém pro sklady — dopravce/dodavatel žádá o slot na konkrétní gate, pracovník skladu schvaluje.

GitHub: https://github.com/Espirantes/timeslotcontrol

---

## Tech stack

- **Next.js 16** (App Router, `[locale]` i18n routing přes `next-intl`)
- **React 19**, TypeScript
- **Prisma 7** — ORM, klient generován do `src/generated/prisma`
  - Import: `import { PrismaClient } from "@/generated/prisma/client"`
  - Singleton: `import { prisma } from "@/lib/prisma"`
- **PostgreSQL** lokálně (Postgres.app, port 5432, DB: `timeslotcontrol`)
- **Auth.js v5** (`next-auth@beta`) — credentials + JWT sessions
- **Tailwind CSS v4** + shadcn/ui komponenty v `src/components/ui/`
- **next-intl v4** — cs, en, it (messages v `messages/`)
- **@fullcalendar/react** — kalendářní pohled
- **pnpm** jako package manager (ne npm, ne yarn)

---

## Databáze

- Migrace: `pnpm prisma migrate dev --name <nazev>`
- Generování klienta: `pnpm prisma generate`
- Prisma config: `prisma.config.ts` — načítá `.env.local`

### Psql binary
`/Applications/Postgres.app/Contents/Versions/18/bin/psql`

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
