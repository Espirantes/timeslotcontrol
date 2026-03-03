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
import { createTransportUnit, updateTransportUnit, deleteTransportUnit } from "@/lib/actions/admin";

type TransportUnitItem = {
  id: string;
  name: string;
  weightKg: number;
  processingMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type FormData = {
  name: string;
  weightKg: string;
  processingMinutes: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyForm: FormData = {
  name: "",
  weightKg: "0",
  processingMinutes: "0",
  isActive: true,
  sortOrder: "0",
};

type Props = {
  items: TransportUnitItem[];
};

export function TransportUnitsClient({ items }: Props) {
  const router = useRouter();
  const t = useTranslations("transportUnit");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(tu: TransportUnitItem) {
    setEditingId(tu.id);
    setForm({
      name: tu.name,
      weightKg: String(tu.weightKg),
      processingMinutes: String(tu.processingMinutes),
      isActive: tu.isActive,
      sortOrder: String(tu.sortOrder),
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    startTransition(async () => {
      try {
        if (editingId) {
          await updateTransportUnit(editingId, {
            name: form.name,
            weightKg: Number(form.weightKg),
            processingMinutes: Number(form.processingMinutes),
            isActive: form.isActive,
            sortOrder: Number(form.sortOrder),
          });
        } else {
          await createTransportUnit({
            name: form.name,
            weightKg: Number(form.weightKg),
            processingMinutes: Number(form.processingMinutes),
            sortOrder: Number(form.sortOrder),
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
        await deleteTransportUnit(id);
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
          <Plus className="size-4 mr-1" /> {t("new")}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">{t("fields.name")}</th>
              <th className="text-left px-4 py-2.5 font-medium w-32">{t("fields.weightKg")}</th>
              <th className="text-left px-4 py-2.5 font-medium w-40">{t("fields.processingMinutes")}</th>
              <th className="text-left px-4 py-2.5 font-medium w-24">{t("fields.sortOrder")}</th>
              <th className="text-left px-4 py-2.5 font-medium w-24">{tc("active")}</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {items.map((tu) => (
              <tr key={tu.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{tu.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{String(tu.weightKg)} kg</td>
                <td className="px-4 py-3 text-muted-foreground">{tu.processingMinutes} min</td>
                <td className="px-4 py-3 text-muted-foreground">{tu.sortOrder}</td>
                <td className="px-4 py-3">
                  <Badge variant={tu.isActive ? "default" : "secondary"}>
                    {tu.isActive ? tc("active") : tc("inactive")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(tu)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(tu.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.weightKg")}</label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.processingMinutes")}</label>
                <Input
                  type="number"
                  min={0}
                  value={form.processingMinutes}
                  onChange={(e) => setForm({ ...form, processingMinutes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.sortOrder")}</label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
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
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
