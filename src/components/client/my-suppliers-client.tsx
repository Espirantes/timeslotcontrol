"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, UserMinus } from "lucide-react";
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
import { createSupplierWithUser, deactivateSupplierUser } from "@/lib/actions/client-actions";
import type { MySupplier } from "@/lib/actions/client-actions";

type Props = {
  suppliers: MySupplier[];
};

type FormData = {
  mode: "existing" | "new";
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  userName: string;
  userEmail: string;
  userPassword: string;
};

const emptyForm: FormData = {
  mode: "new",
  supplierId: "",
  supplierName: "",
  supplierEmail: "",
  userName: "",
  userEmail: "",
  userPassword: "",
};

export function MySuppliersClient({ suppliers }: Props) {
  const t = useTranslations("mySuppliers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  function openCreate() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.userName.trim() || !form.userEmail.trim() || !form.userPassword) return;
    if (form.mode === "new" && !form.supplierName.trim()) return;
    if (form.mode === "existing" && !form.supplierId) return;

    startTransition(async () => {
      try {
        await createSupplierWithUser({
          supplierId: form.mode === "existing" ? form.supplierId : undefined,
          supplierName: form.mode === "new" ? form.supplierName : undefined,
          supplierEmail: form.mode === "new" ? form.supplierEmail : undefined,
          userName: form.userName,
          userEmail: form.userEmail,
          userPassword: form.userPassword,
        });
        toast.success(tc("success"));
        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        if (err instanceof Error && err.message === "EMAIL_EXISTS") {
          toast.error(t("emailExists"));
        } else {
          toast.error(err instanceof Error ? err.message : tc("error"));
        }
      }
    });
  }

  function handleDeactivate(userId: string) {
    startTransition(async () => {
      try {
        await deactivateSupplierUser(userId);
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
          {t("addSupplier")}
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{tc("noData")}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-brand-navy">{s.name}</h3>
                  {s.contactEmail && (
                    <p className="text-sm text-brand-muted">{s.contactEmail}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {s.users.length} {t("accounts")}
                </Badge>
              </div>
              {s.users.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {s.users.map((u) => (
                        <tr key={u.id} className={`border-t first:border-t-0 ${!u.isActive ? "opacity-50" : ""}`}>
                          <td className="px-3 py-2 font-medium">{u.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                          <td className="px-3 py-2">
                            <Badge variant={u.isActive ? "default" : "secondary"} className="text-[10px]">
                              {u.isActive ? tc("active") : tc("inactive")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {u.isActive && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleDeactivate(u.id)} disabled={isPending}>
                                <UserMinus className="size-3.5 mr-1" />
                                {t("deactivate")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addSupplier")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Supplier selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("supplierType")}</label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v as "existing" | "new", supplierId: "", supplierName: "", supplierEmail: "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t("newSupplier")}</SelectItem>
                  {suppliers.length > 0 && (
                    <SelectItem value="existing">{t("existingSupplier")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.mode === "existing" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("selectSupplier")}</label>
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
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{t("supplierName")}</label>
                  <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{t("supplierEmail")}</label>
                  <Input type="email" value={form.supplierEmail} onChange={(e) => setForm({ ...form, supplierEmail: e.target.value })} />
                </div>
              </>
            )}

            <div className="h-px bg-border" />

            {/* User details */}
            <p className="text-sm font-medium text-brand-muted">{t("userDetails")}</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("userName")}</label>
              <Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("userEmail")}</label>
              <Input type="email" value={form.userEmail} onChange={(e) => setForm({ ...form, userEmail: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("userPassword")}</label>
              <Input type="password" value={form.userPassword} onChange={(e) => setForm({ ...form, userPassword: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button
              onClick={handleSave}
              disabled={
                isPending ||
                !form.userName.trim() ||
                !form.userEmail.trim() ||
                !form.userPassword ||
                (form.mode === "new" && !form.supplierName.trim()) ||
                (form.mode === "existing" && !form.supplierId)
              }
            >
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
