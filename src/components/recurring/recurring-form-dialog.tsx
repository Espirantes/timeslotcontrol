"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getFormData } from "@/lib/actions/reservations";
import { createRecurringReservation, type SkippedInstance } from "@/lib/actions/recurring-reservations";
import type { VehicleType, RecurrenceType } from "@/generated/prisma/client";
import { format } from "date-fns";
import { GenerationSummaryDialog } from "./generation-summary-dialog";

const VEHICLE_TYPE_VALUES: VehicleType[] = [
  "TRUCK", "VAN", "TRUCK_DOUBLE_TRAILER", "TRUCK_CURTAINSIDER", "REFRIGERATED_TRUCK", "OTHER",
];

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 360];

// Generate time slots (06:00-22:00 in 15-min increments)
const TIME_SLOTS: string[] = [];
for (let h = 6; h < 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const WEEK_DAYS = [
  { value: 1, label: "Po" },
  { value: 2, label: "Út" },
  { value: 3, label: "St" },
  { value: 4, label: "Čt" },
  { value: 5, label: "Pá" },
  { value: 6, label: "So" },
  { value: 0, label: "Ne" },
];

type ItemRow = {
  transportUnitId: string;
  quantity: number;
  goodsWeightKg: string;
  description: string;
};

type TransportUnitOption = {
  id: string;
  name: string;
  weightKg: number;
  processingMinutes: number;
};

type Gate = { id: string; name: string; openingHours: { dayOfWeek: number; openTime: string; closeTime: string; isOpen: boolean }[] };
type Client = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  onCreated?: () => void;
};

export function RecurringFormDialog({ open, onClose, warehouseId, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("recurring");
  const tRes = useTranslations("reservation");
  const tCommon = useTranslations("common");

  // Form data
  const [gates, setGates] = useState<Gate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transportUnits, setTransportUnits] = useState<TransportUnitOption[]>([]);

  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("WEEKLY");
  const [weekDays, setWeekDays] = useState<number[]>([1]); // Mon default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [noEndDate, setNoEndDate] = useState(true);

  // Reservation template
  const [gateId, setGateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [duration, setDuration] = useState(60);
  const [vehicleType, setVehicleType] = useState<VehicleType>("TRUCK");
  const [licensePlate, setLicensePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [notes, setNotes] = useState("");
  const [reservationType, setReservationType] = useState<"LOADING" | "UNLOADING">("UNLOADING");
  const [items, setItems] = useState<ItemRow[]>([]);

  // Summary dialog
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{ created: number; skipped: SkippedInstance[] }>({ created: 0, skipped: [] });

  useEffect(() => {
    if (!open) return;
    getFormData(warehouseId).then((data) => {
      setGates(data.gates);
      setClients(data.clients);
      setTransportUnits(data.transportUnits);
      if (!gateId && data.gates.length > 0) setGateId(data.gates[0].id);
      if (!clientId && data.clients.length > 0) setClientId(data.clients[0].id);
      if (items.length === 0 && data.transportUnits.length > 0) {
        setItems([{ transportUnitId: data.transportUnits[0].id, quantity: 1, goodsWeightKg: "", description: "" }]);
      }
    });
  }, [open, warehouseId]);

  // Auto-calculate duration from items
  useEffect(() => {
    if (transportUnits.length === 0) return;
    const rawMinutes = items.reduce((sum, item) => {
      const unit = transportUnits.find((u) => u.id === item.transportUnitId);
      return sum + (item.quantity * (unit?.processingMinutes ?? 0));
    }, 0);
    if (rawMinutes > 0) {
      setDuration(Math.max(15, Math.ceil(rawMinutes / 15) * 15));
    }
  }, [items, transportUnits]);

  function toggleWeekDay(day: number) {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { transportUnitId: transportUnits[0]?.id ?? "", quantity: 1, goodsWeightKg: "", description: "" }]);
  }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gateId || !clientId || !timeOfDay) {
      toast.error(tRes("form.requiredFields"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await createRecurringReservation({
          gateId,
          clientId,
          recurrenceType,
          startDate,
          endDate: noEndDate ? undefined : endDate || undefined,
          timeOfDay,
          durationMinutes: duration,
          weekDays: recurrenceType === "WEEKLY" ? weekDays : undefined,
          dayOfMonth: recurrenceType === "MONTHLY" ? dayOfMonth : undefined,
          vehicleType,
          licensePlate: licensePlate || undefined,
          driverName: driverName || undefined,
          driverContact: driverContact || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            transportUnitId: item.transportUnitId,
            quantity: Number(item.quantity),
            goodsWeightKg: item.goodsWeightKg ? Number(item.goodsWeightKg) : undefined,
            description: item.description || undefined,
          })),
          reservationType,
        });

        toast.success(`${t("generation.created")}: ${result.created}`);
        setSummaryData({ created: result.created, skipped: result.skipped });
        setSummaryOpen(true);
        onCreated?.();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Gate + Client */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.gate")} *</label>
                <Select value={gateId} onValueChange={setGateId}>
                  <SelectTrigger><SelectValue placeholder={tRes("form.selectGate")} /></SelectTrigger>
                  <SelectContent>
                    {gates.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.client")} *</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder={tRes("form.selectClient")} /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("type.label")} *</label>
              <div className="flex gap-2">
                {(["DAILY", "WEEKLY", "MONTHLY"] as RecurrenceType[]).map((rt) => (
                  <Button
                    key={rt}
                    type="button"
                    variant={recurrenceType === rt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecurrenceType(rt)}
                  >
                    {t(`type.${rt}`)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Weekly: day checkboxes */}
            {recurrenceType === "WEEKLY" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.weekDays")} *</label>
                <div className="flex gap-1">
                  {WEEK_DAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      variant={weekDays.includes(d.value) ? "default" : "outline"}
                      size="sm"
                      className="w-10"
                      onClick={() => toggleWeekDay(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly: day of month */}
            {recurrenceType === "MONTHLY" && (
              <div className="flex flex-col gap-1.5 max-w-32">
                <label className="text-sm font-medium">{t("fields.dayOfMonth")} *</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                />
              </div>
            )}

            {/* Validity dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.startDate")} *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.endDate")}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={noEndDate}
                    className={noEndDate ? "opacity-50" : ""}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noEndDate}
                    onChange={(e) => setNoEndDate(e.target.checked)}
                    className="rounded"
                  />
                  {t("fields.noEndDate")}
                </label>
              </div>
            </div>

            {/* Transport items */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{tRes("items.title")}</label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-3 mr-1" /> {tRes("items.add")}
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">{tRes("items.unitType")}</th>
                      <th className="text-left px-2 py-1.5 font-medium w-20">{tRes("items.quantity")}</th>
                      <th className="text-left px-2 py-1.5 font-medium w-28">{tRes("items.goodsWeightKg")}</th>
                      <th className="text-left px-2 py-1.5 font-medium">{tRes("items.description")}</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">
                          <Select value={item.transportUnitId} onValueChange={(v) => updateItem(i, "transportUnitId", v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {transportUnits.map((tu) => <SelectItem key={tu.id} value={tu.id}>{tu.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1">
                          <Input type="number" min={1} className="h-7 text-xs" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          <Input type="number" min={0} step="0.1" className="h-7 text-xs" placeholder="kg" value={item.goodsWeightKg} onChange={(e) => updateItem(i, "goodsWeightKg", e.target.value)} />
                        </td>
                        <td className="px-2 py-1">
                          <Input className="h-7 text-xs" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                        </td>
                        <td className="px-2 py-1">
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Time + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("fields.timeOfDay")} *</label>
                <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.duration")}</label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type + Vehicle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("reservationType.label")} *</label>
                <Select value={reservationType} onValueChange={(v) => setReservationType(v as "LOADING" | "UNLOADING")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNLOADING">{tRes("reservationType.UNLOADING")}</SelectItem>
                    <SelectItem value="LOADING">{tRes("reservationType.LOADING")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.vehicleType")} *</label>
                <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPE_VALUES.map((vt) => <SelectItem key={vt} value={vt}>{tRes(`vehicleType.${vt}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Driver info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.licensePlate")}</label>
                <Input placeholder="ABC 1234" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.driverName")}</label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{tRes("fields.driverContact")}</label>
                <Input placeholder="+420 …" value={driverContact} onChange={(e) => setDriverContact(e.target.value)} />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{tRes("fields.notes")}</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-16 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{tCommon("cancel")}</Button>
              <Button type="submit" disabled={isPending || !gateId || !clientId}>
                {isPending ? tRes("form.saving") : t("new")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <GenerationSummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        created={summaryData.created}
        skipped={summaryData.skipped}
      />
    </>
  );
}
