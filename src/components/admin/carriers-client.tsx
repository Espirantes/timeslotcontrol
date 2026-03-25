"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ImportCSVDialog } from "@/components/admin/import-csv-dialog";
import { ExportCSVButton } from "@/components/admin/export-csv-button";
import { bulkImportCarriers } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createCarrier, updateCarrier, deleteCarrier } from "@/lib/actions/admin";
import type { Supplier, SupplierCarrier, Carrier } from "@/generated/prisma/client";

type CarrierWithRelations = Carrier & {
  suppliers: (SupplierCarrier & { supplier: Supplier })[];
  _count: { reservations: number };
};

type Props = {
  items: CarrierWithRelations[];
  suppliers: { id: string; name: string }[];
};

type FormData = {
  name: string;
  contactEmail: string;
  supplierIds: string[];
};

const emptyForm: FormData = { name: "", contactEmail: "", supplierIds: [] };

export function CarriersClient({ items, suppliers }: Props) {
  const t = useTranslations("carrier");
  const tc = useTranslations("common");
  const tSupplier = useTranslations("supplier");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: CarrierWithRelations) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      contactEmail: c.contactEmail ?? "",
      supplierIds: c.suppliers.map((sc) => sc.supplierId),
    });
    setDialogOpen(true);
  }

  function toggleSupplier(supplierId: string) {
    setForm((prev) => ({
      ...prev,
      supplierIds: prev.supplierIds.includes(supplierId)
        ? prev.supplierIds.filter((id) => id !== supplierId)
        : [...prev.supplierIds, supplierId],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      try {
        if (editingId) {
          await updateCarrier(editingId, {
            name: form.name,
            contactEmail: form.contactEmail || undefined,
            supplierIds: form.supplierIds,
          });
        } else {
          await createCarrier({
            name: form.name,
            contactEmail: form.contactEmail || undefined,
            supplierIds: form.supplierIds,
          });
        }
        toast.success(tc("success"));
        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCarrier(id);
        toast.success(tc("success"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <ExportCSVButton
            filename="dopravci.csv"
            rows={[
              ["name", "contactEmail", "suppliers"],
              ...items.map((c) => [
                c.name,
                c.contactEmail ?? "",
                c.suppliers.map((sc) => sc.supplier.name).join(";"),
              ]),
            ]}
          />
          <ImportCSVDialog
            entityType="carrier"
            onImport={(rows) => bulkImportCarriers(rows as Parameters<typeof bulkImportCarriers>[0])}
          />
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            {t("new")}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{tc("noData")}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.name")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.contactEmail")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tSupplier("title")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.reservations")}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contactEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.suppliers.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        c.suppliers.map((sc) => (
                          <Badge key={sc.supplierId} variant="secondary">{sc.supplier.name}</Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{c._count.reservations}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(c.id)} disabled={isPending}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? tc("edit") : t("new")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.name")}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.contactEmail")}</label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            {suppliers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tSupplier("title")}</label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto flex flex-col gap-2">
                  {suppliers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.supplierIds.includes(s.id)}
                        onCheckedChange={() => toggleSupplier(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim()}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
