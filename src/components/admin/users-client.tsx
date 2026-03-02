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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createUser, updateUser, deleteUser } from "@/lib/actions/admin";
import type { User, UserRole, Warehouse, Client, Supplier } from "@/generated/prisma/client";

type UserWithRelations = User & {
  warehouse: Warehouse | null;
  client: Client | null;
  supplier: Supplier | null;
};

type ClientWithRelations = Client & {
  suppliers: unknown[];
  _count: { reservations: number };
};

type SupplierWithRelations = Supplier & {
  clients: unknown[];
  _count: { reservations: number };
};

type Props = {
  items: UserWithRelations[];
  warehouses: Warehouse[];
  clients: ClientWithRelations[];
  suppliers: SupplierWithRelations[];
};

type FormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  warehouseId: string;
  clientId: string;
  supplierId: string;
  isActive: boolean;
};

const ROLES: UserRole[] = ["ADMIN", "WAREHOUSE_WORKER", "CLIENT", "SUPPLIER"];

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  WAREHOUSE_WORKER: "secondary",
  CLIENT: "outline",
  SUPPLIER: "outline",
};

const emptyForm: FormData = {
  name: "",
  email: "",
  password: "",
  role: "CLIENT",
  warehouseId: "",
  clientId: "",
  supplierId: "",
  isActive: true,
};

export function UsersClient({ items, warehouses, clients, suppliers }: Props) {
  const t = useTranslations("user");
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

  function openEdit(u: UserWithRelations) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      warehouseId: u.warehouseId ?? "",
      clientId: u.clientId ?? "",
      supplierId: u.supplierId ?? "",
      isActive: u.isActive,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!editingId && !form.password) return;

    startTransition(async () => {
      try {
        if (editingId) {
          await updateUser(editingId, {
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            role: form.role,
            warehouseId: form.role === "WAREHOUSE_WORKER" ? form.warehouseId || undefined : undefined,
            clientId: form.role === "CLIENT" ? form.clientId || undefined : undefined,
            supplierId: form.role === "SUPPLIER" ? form.supplierId || undefined : undefined,
            isActive: form.isActive,
          });
        } else {
          await createUser({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            warehouseId: form.role === "WAREHOUSE_WORKER" ? form.warehouseId || undefined : undefined,
            clientId: form.role === "CLIENT" ? form.clientId || undefined : undefined,
            supplierId: form.role === "SUPPLIER" ? form.supplierId || undefined : undefined,
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
        await deleteUser(id);
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
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.email")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.role")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tc("detail")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tc("active")}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className={`border-t hover:bg-muted/30 transition-colors ${!u.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[u.role]}>{t(`role.${u.role}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.warehouse && u.warehouse.name}
                    {u.client && u.client.name}
                    {u.supplier && u.supplier.name}
                    {!u.warehouse && !u.client && !u.supplier && "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? tc("active") : tc("inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(u)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(u.id)} disabled={isPending}>
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
              <label className="text-sm font-medium">{t("fields.email")}</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.password")}</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? t("fields.passwordPlaceholder") : undefined}
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">Ponechte prázdné, pokud nechcete měnit heslo</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.role")}</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole, warehouseId: "", clientId: "", supplierId: "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{t(`role.${role}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.role === "WAREHOUSE_WORKER" && warehouses.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.warehouse")}</label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === "CLIENT" && clients.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.client")}</label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === "SUPPLIER" && suppliers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.supplier")}</label>
                <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingId && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded"
                />
                {t("fields.isActive")}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim() || !form.email.trim() || (!editingId && !form.password)}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
