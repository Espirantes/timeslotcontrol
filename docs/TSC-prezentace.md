# TimeSlotControl — Prezentace produktu

## Co je TimeSlotControl?

Webová aplikace pro **plánování a řízení příjezdů kamionů ke skladům**. Nahrazuje ruční koordinaci (telefon, e-mail, Excel) digitálním systémem s přehledným kalendářem, automatickými notifikacemi a jasně definovanými rolemi.

---

## Jaký problém řeší?

| Dnes (bez TSC) | S TSC |
|---|---|
| Dodavatel volá/píše e-mail, kdy může přijet | Dodavatel si sám vybere volný slot v kalendáři |
| Pracovník skladu zapisuje do Excelu | Systém automaticky hlídá kolize a kapacitu ramp |
| Nikdo neví, co je schváleno a co ne | Jasné stavy: Zažádáno → Potvrzeno → Vykládka → Uzavřeno |
| Změny se ztrácejí v e-mailech | Verzování rezervací s historií změn a audit log |
| Nový dodavatel = série telefonátů | Self-registrace + schválení adminem na pár kliků |
| Opakující se dodávky se zadávají ručně znovu | Opakované závozy se generují automaticky |
| Nejde zpětně dohledat kdo co změnil | Audit log zaznamenává každou akci |

---

## Kdo systém používá?

**5 rolí** s přesně definovanými oprávněními:

- **Administrátor** — nastavuje sklady, rampy, klienty, dodavatele, dopravce, uživatele a přepravní jednotky
- **Pracovník skladu** — schvaluje rezervace, řídí průběh vykládky na rampách, spravuje opakované závozy
- **Dodavatel** — firma dodávající zboží; vytváří rezervace, zadává vozidlo a řidiče, může přiřadit dopravce
- **Dopravce** — přepravní firma přiřazená k dodavateli; vidí jen své přiřazené přepravy, vyplňuje údaje o vozidle
- **Klient** — příjemce zboží; sleduje příchozí dodávky, může spravovat vlastní dodavatele (pokud mu to admin povolí)

---

## Hlavní funkce

### Kalendář
Přehledný týdenní kalendář s rampami jako sloupci. Každá rezervace je barevný blok — na první pohled je vidět, co je schválené, co čeká a kde je volno. Filtrování podle skladu. Rozpoznání státních svátků podle země skladu.

### Rezervace
Kompletní životní cyklus od žádosti po uzavření:

**Zažádáno → Potvrzeno → Vykládka zahájena → Vykládka dokončena → Uzavřeno**

Každá rezervace obsahuje:
- Rampa, datum, čas a délka trvání (násobky 15 min)
- Typ přepravy (nakládka / vykládka)
- Klient (příjemce) a dodavatel
- Dopravce (volitelně)
- Údaje o vozidle (typ, SPZ, plombové čísla)
- Jméno a kontakt na řidiče
- Přepravní jednotky s množstvím a váhou
- Dodací avíza
- Přílohy (dokumenty, fotografie)
- Poznámky

Verzování změn — dodavatel navrhne úpravu, pracovník skladu schválí nebo zamítne. Kompletní historie stavů s časovými razítky.

### Správa skladů
Administrátor zakládá sklady s názvem, adresou, zemí a časovou zónou. Sklady lze deaktivovat, pokud se dočasně nepoužívají.

### Správa ramp
Každá rampa patří ke skladu. Nastavení otevíracích hodin pro každý den v týdnu (Po–Ne) — mimo tyto hodiny nelze vytvořit rezervaci. Řazení ramp dle pořadí.

### Blokace ramp
Dočasné uzavření rampy pro údržbu, inventuru nebo svátky. V zablokovaném období nelze vytvořit novou rezervaci. Stávající schválené rezervace zůstávají.

### Přepravní jednotky
Definice typů přepravovaného zboží — palety, kartony, rolcontainery apod. Každá jednotka má:
- Výchozí váhu obalu (kg)
- Dobu zpracování (minuty) — systém automaticky navrhne délku rezervace podle počtu a typu jednotek

### Klienti a dodavatelé
- **Klient** = organizace přijímající zboží (příjemce)
- **Dodavatel** = firma dodávající zboží (odesílatel / dopravce)
- Propojení klient–dodavatel (M:N) určuje, kteří dodavatelé mohou vytvářet rezervace pro kterého klienta
- Klient může mít oprávnění spravovat vlastní dodavatele (zakládat účty, deaktivovat)

### Dopravci
- **Dopravce** = přepravní firma provádějící fyzickou přepravu
- Propojení dodavatel–dopravce (M:N) — jeden dodavatel může používat více dopravců
- Dopravce je na rezervaci volitelný — závisí na tom, zda klient/dodavatel tuto vrstvu využívá
- Dopravce vidí pouze rezervace, kde je přiřazen

### Správa uživatelů
- Vytváření účtů s přiřazením role, skladu, klienta/dodavatele/dopravce
- Tab "Ke schválení" pro nové registrace čekající na admina
- Aktivace / deaktivace účtů

### Opakované závozy
Pravidelné dodávky bez ručního zadávání:
- Denní (Po–Pá), týdenní (vybrané dny) nebo měsíční (konkrétní den)
- Platnost od–do nebo bez konce
- Šablona s kompletními údaji (rampa, klient, dodavatel, vozidlo, přepravní jednotky)
- Automaticky generované rezervace jsou rovnou potvrzeny

### Hromadný import / export (CSV)
Pro rychlé naplnění systému při nasazení:
- **Import klientů** — název, e-mail, oprávnění spravovat dodavatele
- **Import dodavatelů** — název, e-mail, přiřazení ke klientům (středníkem oddělené názvy)
- **Import dopravců** — název, e-mail, přiřazení k dodavatelům
- **Import uživatelů** — jméno, e-mail, role, klient/dodavatel/dopravce, heslo (volitelné — systém vygeneruje náhodné)
- **Export** ve stejném formátu pro zálohu nebo hromadnou úpravu
- Šablony ke stažení, náhled před importem, přehled úspěšných/chybných řádků

### Registrace a schvalování
Noví dodavatelé a dopravci se registrují sami přes veřejný formulář:
1. Vyplní jméno, e-mail, heslo a zprávu pro admina
2. Zvolí, zda se registrují jako dodavatel nebo dopravce
3. Po registraci se mohou přihlásit, ale vidí banner "Čeká na schválení"
4. Admin obdrží notifikaci, vidí zprávu a přiřadí uživatele ke správné organizaci

### Obnova hesla
Zapomenuté heslo = odkaz do e-mailu s 2hodinovou platností. Bezpečný reset bez zásahu admina. Odkaz na přihlašovací stránce.

### Interaktivní průvodce (Product Tour)
Nový uživatel je proveden systémem krok po kroku:
- Průvodce zvýrazňuje reálné prvky v UI (tlačítka, menu položky)
- Naviguje mezi stránkami (sklady → rampy → klienti → dodavatelé → kalendář)
- Přizpůsobený každé roli (admin 10 kroků, dodavatel 5, klient 4, dopravce 5)
- Lze spustit znovu kdykoliv z menu

### Příručka
Stránka s kompletním popisem všech funkcí:
- Přizpůsobená přihlášené roli — admin vidí sekce správy, dodavatel jen to, co se ho týká
- Barevně zvýrazněné tipy s příklady z praxe
- Průvodce životním cyklem rezervace (stavový diagram)

### Notifikace
- **In-app** — zvoneček v hlavičce s počtem nepřečtených
- **E-mail** — upozornění na nové rezervace, schválení, zamítnutí, změny stavu, nové registrace
- **Push v prohlížeči** — volitelné, pro okamžitá upozornění
- Každý uživatel si může v nastavení zapnout/vypnout jednotlivé kanály

### Nastavení uživatele
- Změna zobrazovaného jména
- Změna hesla (zadejte aktuální a nové)
- Konfigurace notifikací (in-app / e-mail / push)

### Audit log
Kompletní záznam všech změn v systému:
- Kdo, kdy a co změnil
- Filtrování podle typu entity (rezervace, uživatel, sklad...)
- Stránkování pro velké objemy dat
- Přístupný pouze adminovi

### Vícejazyčnost
Čeština, angličtina, italština. Přepínání v hlavičce jedním klikem. Všechny texty včetně e-mailových šablon, chybových hlášek a průvodce.

---

## Technologie

| Vrstva | Stack |
|---|---|
| Frontend + Backend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui komponenty |
| ORM | Prisma 7 |
| Databáze | PostgreSQL |
| Autentizace | Auth.js v5 (JWT sessions, bcrypt) |
| E-maily | Resend API |
| Validace | Zod |
| Kalendář | FullCalendar (premium) |
| Product Tour | driver.js |
| Ikony | Lucide React |

---

## Datový model (zjednodušeně)

```
Klient (příjemce zboží)
  └── Dodavatel (firma co dodává)             M:N vztah
        └── Dopravce (přepravní firma)        M:N vztah, volitelný
              └── Uživatel (člověk s loginem)

Sklad
  └── Rampa (vykládací místo)
        ├── Otevírací hodiny (Po–Ne, open/close pro každý den)
        ├── Blokace (dočasné uzavření s důvodem)
        └── Rezervace
              ├── Verze (potvrzená / čekající na schválení)
              │     ├── Přepravní jednotky (typ, množství, váha)
              │     ├── Avíza (číslo, množství, poznámka)
              │     └── Údaje o vozidle a řidiči
              ├── Přílohy (dokumenty, fotografie)
              └── Historie stavů (s časem a autorem)

Opakovaný závoz (šablona)
  └── Generuje instance → Rezervace

Přepravní jednotka (definice)
  ├── Název (paleta EUR, karton, rolcontainer...)
  ├── Váha obalu (kg)
  └── Doba zpracování (minuty)

Notifikace (per uživatel)
Audit log (celý systém)
```

---

## Stav projektu

- Plně funkční aplikace připravená k nasazení
- 204 automatizovaných testů (Vitest)
- 3 jazykové mutace (CZ, EN, IT)
- Responzivní design (desktop + tablet)
- Interaktivní onboarding pro nové uživatele
