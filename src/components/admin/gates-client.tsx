"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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
import { createGate, updateGate, deleteGate, updateGateOpeningHours, getGateBlocks, createGateBlock, deleteGateBlock } from "@/lib/actions/admin";

import { format } from "date-fns";

type WarehouseItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type GateWithRelations = {
  id: string;
  warehouseId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  warehouse: { id: string; name: string };
  // M16: Minimal shape — only fields the component actually reads
  openingHours: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }[];
};

type Props = {
  items: GateWithRelations[];
  warehouses: WarehouseItem[];
};

type FormData = {
  name: string;
  description: string;
  warehouseId: string;
  isActive: boolean;
  sortOrder: string;
};

type HourRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

const defaultHours: HourRow[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "06:00",
  closeTime: "18:00",
  isOpen: i >= 1 && i <= 5,
}));

const emptyForm: FormData = { name: "", description: "", warehouseId: "", isActive: true, sortOrder: "0" };

type BlockItem = {
  id: string;
  startTime: Date;
  endTime: Date;
  reason: string;
  createdBy: { name: string };
};

export function GatesClient({ items, warehouses }: Props) {
  const t = useTranslations("gate");
  const tBlock = useTranslations("gateBlock");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hours, setHours] = useState<HourRow[]>(defaultHours);
  const [hoursPending, setHoursPending] = useState(false);

  // Gate blocks
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [blockForm, setBlockForm] = useState({ date: "", startTime: "08:00", endTime: "17:00", reason: "", isFullDay: true });
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockGateId, setBlockGateId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, warehouseId: warehouses[0]?.id ?? "" });
    setDialogOpen(true);
  }

  function openEdit(g: GateWithRelations) {
    setEditingId(g.id);
    setForm({
      name: g.name,
      description: g.description ?? "",
      warehouseId: g.warehouseId,
      isActive: g.isActive,
      sortOrder: String(g.sortOrder),
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.warehouseId) return;
    startTransition(async () => {
      try {
        if (editingId) {
          await updateGate(editingId, {
            name: form.name,
            description: form.description || undefined,
            isActive: form.isActive,
            sortOrder: Number(form.sortOrder),
          });
        } else {
          await createGate({
            warehouseId: form.warehouseId,
            name: form.name,
            description: form.description || undefined,
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
        await deleteGate(id);
        toast.success(tc("success"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  function toggleExpand(g: GateWithRelations) {
    if (expandedId === g.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(g.id);
    const existing = g.openingHours;
    setHours(
      defaultHours.map((dh) => {
        const found = existing.find((h) => h.dayOfWeek === dh.dayOfWeek);
        return found
          ? { dayOfWeek: found.dayOfWeek, openTime: found.openTime, closeTime: found.closeTime, isOpen: found.isOpen }
          : dh;
      })
    );
    loadBlocks(g.id);
  }

  function loadBlocks(gateId: string) {
    getGateBlocks(gateId).then((data) => {
      setBlocks(data.map((b) => ({ ...b, startTime: new Date(b.startTime), endTime: new Date(b.endTime) })));
    });
  }

  function openBlockCreate(gateId: string) {
    setBlockGateId(gateId);
    setBlockForm({ date: format(new Date(), "yyyy-MM-dd"), startTime: "08:00", endTime: "17:00", reason: "", isFullDay: true });
    setBlockDialogOpen(true);
  }

  function handleSaveBlock() {
    if (!blockGateId || !blockForm.reason.trim()) return;
    const startISO = blockForm.isFullDay
      ? new Date(`${blockForm.date}T00:00:00`).toISOString()
      : new Date(`${blockForm.date}T${blockForm.startTime}:00`).toISOString();
    const endISO = blockForm.isFullDay
      ? new Date(`${blockForm.date}T23:59:59`).toISOString()
      : new Date(`${blockForm.date}T${blockForm.endTime}:00`).toISOString();
    startTransition(async () => {
      try {
        await createGateBlock({ gateId: blockGateId!, startTime: startISO, endTime: endISO, reason: blockForm.reason.trim() });
        toast.success(tBlock("created"));
        setBlockDialogOpen(false);
        loadBlocks(blockGateId!);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  function handleDeleteBlock(id: string) {
    startTransition(async () => {
      try {
        await deleteGateBlock(id);
        toast.success(tBlock("deleted"));
        if (expandedId) loadBlocks(expandedId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      }
    });
  }

  function saveHours(gateId: string) {
    setHoursPending(true);
    startTransition(async () => {
      try {
        await updateGateOpeningHours(gateId, hours);
        toast.success(tc("success"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tc("error"));
      } finally {
        setHoursPending(false);
      }
    });
  }

  function updateHour(dayOfWeek: number, field: keyof HourRow, value: string | boolean) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
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
                <th className="w-8" />
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.name")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.description")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("fields.warehouse")}</th>
                <th className="text-left px-4 py-2.5 font-medium w-24">{t("fields.sortOrder")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{tc("active")}</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <>
                  <tr key={g.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-3">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleExpand(g)}>
                        {expandedId === g.id ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </Button>
                    </td>
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.description || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.warehouse.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.sortOrder}</td>
                    <td className="px-4 py-3">
                      <Badge variant={g.isActive ? "default" : "secondary"}>
                        {g.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(g)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(g.id)} disabled={isPending}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === g.id && (
                    <tr key={`${g.id}-hours`} className="border-t bg-muted/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="flex flex-col gap-3">
                          <h3 className="text-sm font-medium">{t("openingHours")}</h3>
                          <div className="grid gap-2">
                            {hours.map((h) => (
                              <div key={h.dayOfWeek} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 w-28">
                                  <input
                                    type="checkbox"
                                    checked={h.isOpen}
                                    onChange={(e) => updateHour(h.dayOfWeek, "isOpen", e.target.checked)}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{t(`days.${h.dayOfWeek}`)}</span>
                                </label>
                                <Input
                                  type="time"
                                  value={h.openTime}
                                  onChange={(e) => updateHour(h.dayOfWeek, "openTime", e.target.value)}
                                  className="w-32"
                                  disabled={!h.isOpen}
                                />
                                <span className="text-muted-foreground">—</span>
                                <Input
                                  type="time"
                                  value={h.closeTime}
                                  onChange={(e) => updateHour(h.dayOfWeek, "closeTime", e.target.value)}
                                  className="w-32"
                                  disabled={!h.isOpen}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <Button size="sm" onClick={() => saveHours(g.id)} disabled={hoursPending}>
                              {hoursPending ? tc("loading") : tc("save")}
                            </Button>
                          </div>

                          {/* Gate blocks */}
                          <div className="border-t pt-3 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium">{tBlock("title")}</h3>
                              <Button size="sm" variant="outline" onClick={() => openBlockCreate(g.id)}>
                                <Plus className="size-3 mr-1" /> {tBlock("add")}
                              </Button>
                            </div>
                            {blocks.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{tc("noData")}</p>
                            ) : (
                              <div className="space-y-1">
                                {blocks.map((b) => (
                                  <div key={b.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                                    <div>
                                      <span className="font-medium">{format(b.startTime, "d.M.yyyy")}</span>
                                      {" "}
                                      <span className="text-muted-foreground">
                                        {format(b.startTime, "H:mm")} – {format(b.endTime, "H:mm")}
                                      </span>
                                      {" — "}
                                      <span>{b.reason}</span>
                                      <span className="text-xs text-muted-foreground ml-2">({b.createdBy.name})</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteBlock(b.id)} disabled={isPending}>
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
              <label className="text-sm font-medium">{t("fields.description")}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
            {!editingId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.warehouse")}</label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
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
                {tc("active")}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim() || !form.warehouseId}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block creation dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tBlock("add")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{tBlock("date")}</label>
              <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={blockForm.isFullDay}
                onChange={(e) => setBlockForm({ ...blockForm, isFullDay: e.target.checked })}
                className="rounded"
              />
              {tBlock("fullDay")}
            </label>
            {!blockForm.isFullDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{tBlock("startTime")}</label>
                  <Input type="time" value={blockForm.startTime} onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{tBlock("endTime")}</label>
                  <Input type="time" value={blockForm.endTime} onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{tBlock("reason")} *</label>
              <Input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSaveBlock} disabled={isPending || !blockForm.reason.trim() || !blockForm.date}>
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
