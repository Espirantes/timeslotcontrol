"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient, updateClient, deleteClient, bulkToggleCanManageSuppliers } from "@/lib/actions/admin";
import type { Client, Supplier, ClientSupplier } from "@/generated/prisma/client";

type ClientWithRelations = Client & {
  suppliers: (ClientSupplier & { supplier: Supplier })[];
  _count: { reservations: number };
};

type Props = {
  items: ClientWithRelations[];
};

type FormData = {
  name: string;
  contactEmail: string;
  canManageSuppliers: boolean;
};

const emptyForm: FormData = { name: "", contactEmail: "", canManageSuppliers: false };

export function ClientsClient({ items }: Props) {
  const t = useTranslations("client");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const anyCanManage = items.some((c) => c.canManageSuppliers);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: ClientWithRelations) {
    setEditingId(c.id);
    setForm({ name: c.name, contactEmail: c.contactEmail ?? "", canManageSuppliers: c.canManageSuppliers });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      try {
        if (editingId) {
          await updateClient(editingId, {
            name: form.name,
            contactEmail: form.contactEmail || undefined,
            canManageSuppliers: form.canManageSuppliers,
          });
        } else {
          await createClient({
            name: form.name,
            contactEmail: form.contactEmail || undefined,
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
        await deleteClient(id);
        toast.success(tc("success"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  function handleBulkToggle() {
    startTransition(async () => {
      try {
        await bulkToggleCanManageSuppliers(!anyCanManage);
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
          <Button size="sm" variant="outline" onClick={handleBulkToggle} disabled={isPending}>
            {anyCanManage ? (
              <><ShieldOff className="size-4 mr-1" />{t("disableAllSupplierMgmt")}</>
            ) : (
              <><ShieldCheck className="size-4 mr-1" />{t("enableAllSupplierMgmt")}</>
            )}
          </Button>
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
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.suppliers")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.reservations")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.canManageSuppliers")}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contactEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.suppliers.length}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{c._count.reservations}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.canManageSuppliers ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
            {editingId && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.canManageSuppliers}
                  onChange={(e) => setForm({ ...form, canManageSuppliers: e.target.checked })}
                  className="rounded"
                />
                {t("fields.canManageSuppliers")}
              </label>
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
