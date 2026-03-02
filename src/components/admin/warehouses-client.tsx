"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { createWarehouse, updateWarehouse, deleteWarehouse } from "@/lib/actions/admin";
import type { Warehouse } from "@/generated/prisma/client";

type Props = {
  items: Warehouse[];
};

type FormData = {
  name: string;
  address: string;
  timezone: string;
  isActive: boolean;
};

const emptyForm: FormData = { name: "", address: "", timezone: "Europe/Prague", isActive: true };

export function WarehousesClient({ items }: Props) {
  const t = useTranslations("warehouse");
  const tc = useTranslations("common");
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

  function openEdit(w: Warehouse) {
    setEditingId(w.id);
    setForm({ name: w.name, address: w.address ?? "", timezone: w.timezone, isActive: w.isActive });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      try {
        if (editingId) {
          await updateWarehouse(editingId, {
            name: form.name,
            address: form.address || undefined,
            timezone: form.timezone || undefined,
            isActive: form.isActive,
          });
          toast.success(tc("success"));
        } else {
          await createWarehouse({
            name: form.name,
            address: form.address || undefined,
            timezone: form.timezone || undefined,
          });
          toast.success(tc("success"));
        }
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
        await deleteWarehouse(id);
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
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          {t("new")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{tc("noData")}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.name")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.address")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.timezone")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tc("active")}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.address || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.timezone}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.isActive ? "default" : "secondary"}>
                      {w.isActive ? tc("active") : tc("inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(w)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(w.id)} disabled={isPending}>
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
              <label className="text-sm font-medium">{t("fields.address")}</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.timezone")}</label>
              <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
            {editingId && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded"
                />
                {tc("active")}
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
