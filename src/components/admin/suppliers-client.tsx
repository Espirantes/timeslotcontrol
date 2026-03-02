"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/admin";
import type { Client, Supplier, ClientSupplier } from "@/generated/prisma/client";

type ClientWithRelations = Client & {
  suppliers: (ClientSupplier & { supplier: Supplier })[];
  _count: { reservations: number };
};

type SupplierWithRelations = Supplier & {
  clients: (ClientSupplier & { client: Client })[];
  _count: { reservations: number };
};

type Props = {
  items: SupplierWithRelations[];
  clients: ClientWithRelations[];
};

type FormData = {
  name: string;
  contactEmail: string;
  clientIds: string[];
};

const emptyForm: FormData = { name: "", contactEmail: "", clientIds: [] };

export function SuppliersClient({ items, clients }: Props) {
  const t = useTranslations("supplier");
  const tc = useTranslations("common");
  const tClient = useTranslations("client");
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

  function openEdit(s: SupplierWithRelations) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactEmail: s.contactEmail ?? "",
      clientIds: s.clients.map((c) => c.clientId),
    });
    setDialogOpen(true);
  }

  function toggleClient(clientId: string) {
    setForm((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId)
        ? prev.clientIds.filter((id) => id !== clientId)
        : [...prev.clientIds, clientId],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      try {
        if (editingId) {
          await updateSupplier(editingId, {
            name: form.name,
            contactEmail: form.contactEmail || undefined,
            clientIds: form.clientIds,
          });
        } else {
          await createSupplier({
            name: form.name,
            contactEmail: form.contactEmail || undefined,
            clientIds: form.clientIds,
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
        await deleteSupplier(id);
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
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.contactEmail")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tClient("title")}</th>
                <th className="text-left px-4 py-2.5 font-medium">Rezervace</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.contactEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.clients.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        s.clients.map((cs) => (
                          <Badge key={cs.clientId} variant="secondary">{cs.client.name}</Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{s._count.reservations}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(s.id)} disabled={isPending}>
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
            {clients.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tClient("title")}</label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto flex flex-col gap-2">
                  {clients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.clientIds.includes(c.id)}
                        onCheckedChange={() => toggleClient(c.id)}
                      />
                      {c.name}
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
