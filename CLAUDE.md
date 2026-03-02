# TimeSlotControl — Claude Code Context

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

---

## Design systém (aktuální)

- Font: **Inter** (300/400/500/600) via `next/font/google`, var `--font-inter`
- Barvy: `slate-50` bg, `white` karty, `slate-900` primary button, `indigo-600` accent + focus ring
- Sidebar: `slate-50` bg, aktivní item = `bg-white shadow-sm border`, ikony `indigo-600` aktivní
- Scrollbar: 6px, `slate-200` thumb

---

## ⚠️ KNOWN BUG — PRIORITA #1 (neřešeno)

**Všechny `/dashboard/*` routy vrací 404.**

- `(dashboard)/layout.tsx` je teď stripped na prázdný passthrough
- `calendar/page.tsx` je stripped na `<h1>Kalendář TEST</h1>`
- `next.config.ts` — `turbopack: { root: __dirname }` odstraněn
- Login stránka `/cs/login` funguje (200) — problém specifický pro `(dashboard)` route group
- Vyzkoušeno: smazání `.next` cache, stripped layout i page → pořád 404
- Pravděpodobně Turbopack bug s route groups vnořenými pod `[locale]`

**Nejdřív vyzkoušet:** `pnpm dev --turbopack` vs `pnpm dev --no-turbopack` — pokud bez Turbopack funguje, je to Turbopack bug a řešení je přidat do `next.config.ts` `experimental: { turbo: false }` nebo upgradovat Next.js.

**Po fixu obnovit tyto dva soubory:**

`src/app/[locale]/(dashboard)/layout.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
          <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
          <Separator orientation="vertical" className="h-4 bg-slate-200" />
          <span className="text-xs text-slate-500 font-medium">TimeSlotControl</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
```

`src/app/[locale]/(dashboard)/calendar/page.tsx`:
```tsx
import { auth } from "@/auth";
import { getWarehouses } from "@/lib/actions/calendar";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const warehouses = await getWarehouses();

  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Kalendář</h1>
        <p className="text-muted-foreground">Nejsou k dispozici žádné sklady.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Kalendář rezervací</h1>
      <CalendarPageClient
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        defaultWarehouseId={warehouses[0].id}
      />
    </div>
  );
}
```

---

## Hotovo (session 2025-03)

- ✅ `ReservationFormDialog` — gate/čas/vozidlo/přepravní jednotky, `createReservation` action
- ✅ `approveReservation`, `rejectReservation`, `updateReservationStatus`, `getReservationList`
- ✅ `ReservationsListClient` — taby Ke schválení / Všechny, inline approve/reject
- ✅ `CalendarView` — `dateClick` otvírá dialog, tlačítko "Nová rezervace"
- ✅ Design system — Inter font, slate/indigo CSS vars, custom scrollbar, sidebar restyle

## TODO (zbývá)

1. **FIX 404** — dořešit `(dashboard)` route group; obnovit stripped soubory
2. **Detail rezervace** — `/dashboard/reservations/[id]` + stavová tlačítka
3. **Admin CRUD** — warehouses, gates + opening hours, users, clients, suppliers
4. **Email notifikace** — Resend API via fetch (bez package)
5. **i18n** — EN + IT překlady (zatím jen CS klíče)
