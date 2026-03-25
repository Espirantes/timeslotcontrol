"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, CheckCircle2, AlertCircle, Copy, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ImportResult, UserImportResult } from "@/lib/actions/import";

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current); current = ""; continue; }
      current += ch;
    }
    values.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
  });
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate(rows: string[][], filename: string) {
  const content = rows.map((r) => r.map((c) => (c.includes(",") || c.includes(";") ? `"${c}"` : c)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    >
      {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
    </button>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

type EntityType = "client" | "supplier" | "carrier" | "user";

type ColDef = { key: string; label: string };

type EntityConfig = {
  label: string;
  templateRows: string[][];
  templateFile: string;
  previewCols: ColDef[];
  hint: string;
};

const CONFIG: Record<EntityType, EntityConfig> = {
  client: {
    label: "klientů",
    templateRows: [
      ["name", "contactEmail", "canManageSuppliers"],
      ["Firma ABC s.r.o.", "kontakt@firma.cz", "ne"],
      ["Firma XYZ", "", "ano"],
    ],
    templateFile: "import-klienti.csv",
    previewCols: [
      { key: "name", label: "Název" },
      { key: "contactemail", label: "Kontaktní e-mail" },
      { key: "canmanagesuppliers", label: "Spravuje dodavatele" },
    ],
    hint: "canManageSuppliers: ano/ne — zda může klient spravovat vlastní dodavatele a tvořit rezervace za ně.",
  },
  supplier: {
    label: "dodavatelů",
    templateRows: [
      ["name", "contactEmail", "clients"],
      ["Dodavatel ABC", "info@abc.cz", "Firma ABC s.r.o."],
      ["Dodavatel XYZ", "", "Firma ABC s.r.o.;Firma XYZ"],
    ],
    templateFile: "import-dodavatele.csv",
    previewCols: [
      { key: "name", label: "Název" },
      { key: "contactemail", label: "Kontaktní e-mail" },
      { key: "clients", label: "Klienti (středník)" },
    ],
    hint: "clients: názvy klientů oddělené středníkem (;). Klienti musí v systému existovat. Dodavatel bude s nimi automaticky propojen.",
  },
  carrier: {
    label: "dopravců",
    templateRows: [
      ["name", "contactEmail", "suppliers"],
      ["Dopravce ABC", "info@dopravce.cz", "Dodavatel ABC"],
      ["Dopravce XYZ", "", "Dodavatel ABC;Dodavatel XYZ"],
    ],
    templateFile: "import-dopravci.csv",
    previewCols: [
      { key: "name", label: "Název" },
      { key: "contactemail", label: "Kontaktní e-mail" },
      { key: "suppliers", label: "Dodavatelé (středník)" },
    ],
    hint: "suppliers: názvy dodavatelů oddělené středníkem (;). Dodavatelé musí v systému existovat. Dopravce bude s nimi automaticky propojen.",
  },
  user: {
    label: "uživatelů",
    templateRows: [
      ["name", "email", "role", "client", "supplier", "carrier", "password"],
      ["Jan Novák", "jan@firma.cz", "WAREHOUSE_WORKER", "", "", "", ""],
      ["Petr Rychlý", "petr@abc.cz", "SUPPLIER", "", "Dodavatel ABC", "", ""],
      ["Eva Malá", "eva@firma.cz", "CLIENT", "Firma ABC s.r.o.", "", "", ""],
      ["Karel Řidič", "karel@dopravce.cz", "CARRIER", "", "", "Dopravce ABC", ""],
      ["Admin Test", "admin@tsc.cz", "ADMIN", "", "", "", "MojeHeslo123"],
    ],
    templateFile: "import-uzivatele.csv",
    previewCols: [
      { key: "name", label: "Jméno" },
      { key: "email", label: "E-mail" },
      { key: "role", label: "Role" },
      { key: "client", label: "Klient" },
      { key: "supplier", label: "Dodavatel" },
      { key: "carrier", label: "Dopravce" },
      { key: "password", label: "Heslo" },
    ],
    hint: "role: ADMIN | WAREHOUSE_WORKER | SUPPLIER | CLIENT | CARRIER. client/supplier/carrier: přesný název z DB. password: pokud prázdné, vygeneruje se náhodné.",
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  entityType: EntityType;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult | UserImportResult>;
};

export function ImportCSVDialog({ entityType, onImport }: Props) {
  const cfg = CONFIG[entityType];
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<(ImportResult | UserImportResult) | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    file.text().then((text) => setRows(parseCSV(text)));
  }

  function handleImport() {
    startTransition(async () => {
      const res = await onImport(rows);
      setResult(res);
      setRows([]);
    });
  }

  const isUserResult = (r: ImportResult | UserImportResult): r is UserImportResult =>
    "credentials" in r && Array.isArray((r as UserImportResult).credentials);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <Upload className="size-4 mr-1" />
        Import CSV
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hromadný import {cfg.label}</DialogTitle>
          </DialogHeader>

          {!result && (
            <div className="space-y-4">
              {/* Hint */}
              <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>{cfg.hint}</span>
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Stáhněte šablonu se správnými sloupci.
                  <span className="ml-2 text-xs text-muted-foreground/60">
                    {cfg.templateRows[0].join(", ")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => downloadTemplate(cfg.templateRows, cfg.templateFile)}
                >
                  <Download className="size-4 mr-1" />
                  Šablona
                </Button>
              </div>

              {/* File drop / picker */}
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-10 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              >
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {fileName ? (
                    <span className="font-medium text-foreground">{fileName}</span>
                  ) : (
                    <>Přetáhněte soubor nebo <span className="underline">vyberte ze zařízení</span></>
                  )}
                </p>
                {fileName && rows.length > 0 && (
                  <Badge variant="secondary">{rows.length} řádků k importu</Badge>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {/* Preview */}
              {rows.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Náhled (prvních 5 řádků):</p>
                  <div className="overflow-x-auto rounded-md border border-border text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                          {cfg.previewCols.map((c) => (
                            <th key={c.key} className="px-3 py-2 text-left font-medium text-muted-foreground">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                            {cfg.previewCols.map((c) => (
                              <td key={c.key} className="px-3 py-1.5 max-w-[180px] truncate" title={row[c.key]}>
                                {row[c.key] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">...a dalších {rows.length - 5} řádků</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-center">
                  <CheckCircle2 className="size-5 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-xs text-green-600">Vytvořeno</div>
                </div>
                {result.failed > 0 && (
                  <div className="flex-1 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-center">
                    <AlertCircle className="size-5 text-red-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                    <div className="text-xs text-red-500">Selhalo</div>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 mb-2">Chyby:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Řádek {e.row}: {e.message}</p>
                  ))}
                </div>
              )}

              {/* Credentials for user import */}
              {isUserResult(result) && result.credentials.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Přihlašovací údaje
                    {result.credentials.some(c => c.generated) && (
                      <span className="ml-1 text-amber-600">— vygenerovaná hesla uložte, nebudou znovu zobrazena</span>
                    )}
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border text-xs max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jméno</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">E-mail</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Heslo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.credentials.map((c, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5">{c.name}</td>
                            <td className="px-3 py-1.5">{c.email}</td>
                            <td className="px-3 py-1.5 font-mono">
                              <span className={c.generated ? "text-amber-700" : ""}>{c.password}</span>
                              <CopyBtn text={c.password} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
                <Button onClick={handleImport} disabled={rows.length === 0 || isPending}>
                  {isPending ? "Importuji..." : `Importovat${rows.length > 0 ? ` (${rows.length})` : ""}`}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={reset}>Importovat další</Button>
                <Button onClick={() => setOpen(false)}>Zavřít</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
