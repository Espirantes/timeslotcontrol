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
- User ↔ Warehouse = M:N (uživatel může mít přístup k více skladům)
- Supplier vždy vytváří rezervaci ve vztahu ke konkrétnímu klientovi
- Client vidí detail rezervací všech svých supplierů; cizí = "Obsazeno"
- Supplieři navzájem rezervace nevidí

### Role
| Role | Přístup |
|------|---------|
| ADMIN | Vše na všech skladech, správa entit |
| WAREHOUSE_WORKER | Vše na přiřazených skladech, schvaluje, mění stavy |
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

## Skills (slash commands)

Skills v `.claude/commands/` slouží jako **závazná pravidla**. Při relevantní práci si vždy přečti příslušný skill soubor — jsou to živé dokumenty, které se mohou aktualizovat.

> Skills jsou **external** (z https://gitlab.com/mailstep/ai-tooling/agent-skills) a v `.gitignore`. Neclonují se s repem — nainstaluj ručně do `.claude/commands/`.

| Skill | Soubor | Kdy číst |
|-------|--------|----------|
| `/git-commit` | `.claude/commands/git-commit.md` | Před každým commitem |
| `/prisma-expert` | `.claude/commands/prisma-expert.md` | Při práci s DB, schématem, migracemi, queries |
| `/typescript-specialist` | `.claude/commands/typescript-specialist.md` | Při TS chybách, refactoringu, tsconfig |
| `/web-design-reviewer` | `.claude/commands/web-design-reviewer.md` | Při vizuálním review UI |
| `/vitest` | `.claude/commands/vitest.md` | Při psaní testů |
| `/javascript-testing-patterns` | `.claude/commands/javascript-testing-patterns.md` | Testing patterns, mocking |
| `/docker-expert` | `.claude/commands/docker-expert.md` | Dockerfile, docker-compose |
| `/prd` | `.claude/commands/prd.md` | Generování PRD dokumentů |

**Pozor:** Některé skills (např. `mailstep-nodejs-service`) jsou generické Mailstep šablony — pro tento projekt platí vždy pravidla z CLAUDE.md (např. `pnpm`, ne `npm`).

---

## Databáze

### Prvotní setup na novém PC
```bash
pnpm install
cp .env.local.example .env.local
pnpm db:setup
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
- **ReservationStatusChange** — historie změn stavů s timestampem a autorem
- **AuditLog** — každá změna logována
- **UserWarehouse** — M:N join tabulka (uživatel ↔ sklad)

### Approval flow
1. Supplier vytvoří → `status: REQUESTED`, `pendingVersionId` = nová verze
2. Worker schválí → `status: CONFIRMED`, `confirmedVersionId` = verze
3. Supplier změní confirmed → nová `pendingVersionId` (confirmed zůstává platná)
4. Worker schválí/zamítne změnu

### Viditelnost
- Supplier: jen své rezervace s detailem; cizí = "Obsazeno"
- Client: detail svých + všech svých suppliers; ostatní = "Obsazeno"
- Warehouse Worker: vše na přiřazených skladech
- Admin: vše na všech skladech

---

## Uživatelské role

- `ADMIN` — všechny sklady, správa entit
- `WAREHOUSE_WORKER` — přiřazené sklady (M:N), schvaluje rezervace, mění stavy
- `CLIENT` — vidí své + child rezervace
- `SUPPLIER` — vidí jen své rezervace

Uloženo v JWT: `session.user.role`, `warehouseIds`, `clientId`, `supplierId`

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

## i18n

Při přidávání jakékoli nové UI kopie je nutné přidat klíč do **všech tří** souborů:
- `messages/cs.json`
- `messages/en.json`
- `messages/it.json`

Překlady enums jsou v JSON klíčích:
- `reservation.status.*` — ReservationStatus
- `reservation.vehicleType.*` — VehicleType
- `reservation.unitType.*` — TransportUnitType
- `user.role.*` — UserRole

---

## Email notifikace

- `src/lib/email.ts` — Resend API via fetch (bez package)
- Branded HTML šablona: Mailstep logo, `#db2b19` red accent, navy header/footer
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
- Notifikace: created → workers, approved/rejected → supplier+client, status change → supplier+client

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
- ❌ Nepoužívej `any` — preferuj `unknown` s type guards
- ❌ Nepoužívej `@ts-ignore` — preferuj `@ts-expect-error`
- ❌ Nevytvářej N+1 queries — vždy `include` nebo `select`
- ❌ Nepoužívej `prisma migrate dev` v produkci

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
- ✅ In-app notifikace — zvoneček, popover, polling 10s, browser push
- ✅ Audit log — admin-only stránka s filtrováním a paginací
- ✅ Notifikační preference — email/in-app/browser přepínače v nastavení
- ✅ DB seed — `prisma/seed-data/seed.sql` + `pnpm db:setup` / `pnpm db:reset`
- ✅ Multi-warehouse přístup — M:N vztah User ↔ Warehouse, `warehouseIds` v session
- ✅ Prevence zpětných rezervací — non-admin nemůže vytvořit rezervaci v minulosti
- ✅ Historie stavů — `ReservationStatusChange` tabulka, timeline na detailu

## TODO (zbývá)

1. **Role-based visibility** — otestovat všechny 4 role v UI
2. **Deployment** — Docker/Vercel setup, env variables
