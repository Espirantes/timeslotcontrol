"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { editReservation, getFormData } from "@/lib/actions/reservations";
import type { ReservationDetail } from "@/lib/actions/reservations";
import type { VehicleType, UserRole } from "@/generated/prisma/client";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPE_VALUES: VehicleType[] = [
  "TRUCK", "VAN", "TRUCK_DOUBLE_TRAILER", "TRUCK_CURTAINSIDER", "REFRIGERATED_TRUCK", "OTHER",
];

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 360];

// ─── Types ────────────────────────────────────────────────────────────────────

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

type GateHours = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

type Gate = { id: string; name: string; openingHours: GateHours[] };

type Props = {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  warehouseId: string;
  onEdited?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  let h = oh, m = om;
  while (h * 60 + m < ch * 60 + cm) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 15;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

function getAvailableSlots(gate: Gate | undefined, date: Date, isAdmin: boolean): string[] {
  if (!gate) return [];
  const dayOfWeek = date.getDay();
  const hours = gate.openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) {
    return isAdmin ? generateTimeSlots("06:00", "22:00") : [];
  }
  return isAdmin
    ? generateTimeSlots("06:00", "22:00")
    : generateTimeSlots(hours.openTime, hours.closeTime);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReservationEditDialog({
  open, onClose, reservation, warehouseId, onEdited,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");

  const version = (reservation.confirmedVersion ?? reservation.pendingVersion)!;

  // Form data from server
  const [gates, setGates] = useState<Gate[]>([]);
  const [userRole, setUserRole] = useState<UserRole>("CLIENT");
  const [transportUnits, setTransportUnits] = useState<TransportUnitOption[]>([]);

  // Form state — initialized from confirmed version
  const initDate = format(new Date(version.startTime), "yyyy-MM-dd");
  const initTime = format(new Date(version.startTime), "HH:mm");

  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initTime);
  const [duration, setDuration] = useState(version.durationMinutes);
  const [vehicleType, setVehicleType] = useState<VehicleType>(version.vehicleType as VehicleType);
  const [licensePlate, setLicensePlate] = useState(version.licensePlate ?? "");
  const [sealNumbers, setSealNumbers] = useState(version.sealNumbers ?? "");
  const [driverName, setDriverName] = useState(version.driverName ?? "");
  const [driverContact, setDriverContact] = useState(version.driverContact ?? "");
  const [notes, setNotes] = useState(version.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    version.items.map((i) => ({
      transportUnitId: i.transportUnitId,
      quantity: i.quantity,
      goodsWeightKg: i.goodsWeightKg != null ? String(i.goodsWeightKg) : "",
      description: i.description ?? "",
    })),
  );

  function defaultItem(): ItemRow {
    return { transportUnitId: transportUnits[0]?.id ?? "", quantity: 1, goodsWeightKg: "", description: "" };
  }

  // Load form data when dialog opens
  useEffect(() => {
    if (!open) return;
    getFormData(warehouseId).then((data) => {
      setGates(data.gates);
      setUserRole(data.userRole as UserRole);
      setTransportUnits(data.transportUnits);
    });
  }, [open, warehouseId]);

  // Re-initialize form when reservation changes
  useEffect(() => {
    if (!open) return;
    const v = reservation.confirmedVersion ?? reservation.pendingVersion;
    if (!v) return;
    const d = format(new Date(v.startTime), "yyyy-MM-dd");
    const tm = format(new Date(v.startTime), "HH:mm");
    setDate(d);
    setStartTime(tm);
    setDuration(v.durationMinutes);
    setVehicleType(v.vehicleType as VehicleType);
    setLicensePlate(v.licensePlate ?? "");
    setSealNumbers(v.sealNumbers ?? "");
    setDriverName(v.driverName ?? "");
    setDriverContact(v.driverContact ?? "");
    setNotes(v.notes ?? "");
    setItems(v.items.map((i) => ({
      transportUnitId: i.transportUnitId,
      quantity: i.quantity,
      goodsWeightKg: i.goodsWeightKg != null ? String(i.goodsWeightKg) : "",
      description: i.description ?? "",
    })));
  }, [open, reservation]);

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

  const isAdmin = userRole === "ADMIN";
  const gateForSlots = gates.find((g) => g.name === reservation.gateName);
  const parsedDate = new Date(date + "T12:00:00");
  const timeSlots = getAvailableSlots(gateForSlots, parsedDate, isAdmin);

  // Weight calculations
  const totalGoodsWeight = items.reduce((sum, item) => sum + (item.goodsWeightKg ? Number(item.goodsWeightKg) : 0), 0);
  const totalPackagingWeight = items.reduce((sum, item) => {
    const unit = transportUnits.find((u) => u.id === item.transportUnitId);
    return sum + (item.quantity * (unit?.weightKg ?? 0));
  }, 0);
  const totalWeight = totalGoodsWeight + totalPackagingWeight;

  function addItem() { setItems((prev) => [...prev, defaultItem()]); }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startTime) {
      toast.error(t("form.requiredFields"));
      return;
    }

    const startISO = new Date(`${date}T${startTime}:00`).toISOString();

    startTransition(async () => {
      try {
        const result = await editReservation({
          reservationId: reservation.id,
          startTime: startISO,
          durationMinutes: duration,
          vehicleType,
          licensePlate: licensePlate || null,
          sealNumbers: sealNumbers || null,
          driverName: driverName || null,
          driverContact: driverContact || null,
          notes: notes || null,
          items: items.map((item) => ({
            transportUnitId: item.transportUnitId,
            quantity: Number(item.quantity),
            goodsWeightKg: item.goodsWeightKg ? Number(item.goodsWeightKg) : null,
            description: item.description || null,
          })),
        });

        toast.success(result.isCritical ? t("edit.submittedForApproval") : t("edit.saved"));
        onEdited?.();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Gate + Client — readonly */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.gate")}</label>
              <p className="text-sm px-3 py-2 border rounded-md bg-muted/50">{reservation.gateName}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.client")}</label>
              <p className="text-sm px-3 py-2 border rounded-md bg-muted/50">{reservation.clientName}</p>
            </div>
          </div>

          {/* Transport items */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("items.title")}</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3 mr-1" /> {t("items.add")}
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">{t("items.unitType")}</th>
                    <th className="text-left px-2 py-1.5 font-medium w-20">{t("items.quantity")}</th>
                    <th className="text-left px-2 py-1.5 font-medium w-28">{t("items.goodsWeightKg")}</th>
                    <th className="text-left px-2 py-1.5 font-medium">{t("items.description")}</th>
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
                        <Input
                          type="number" min={1} className="h-7 text-xs"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number" min={0} step="0.1" className="h-7 text-xs"
                          placeholder="kg"
                          value={item.goodsWeightKg}
                          onChange={(e) => updateItem(i, "goodsWeightKg", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-7 text-xs"
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                        />
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
            {(totalGoodsWeight > 0 || totalPackagingWeight > 0) && (
              <p className="text-xs text-muted-foreground">
                {t("form.totalWeight")}: <span className="font-medium text-foreground">{totalWeight.toFixed(1)} kg</span>
                {" "}({totalGoodsWeight.toFixed(1)} kg {t("form.goods")} + {totalPackagingWeight.toFixed(1)} kg {t("form.packaging")})
              </p>
            )}
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("form.date")}</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.startTime")}</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue placeholder={t("form.selectTime")} /></SelectTrigger>
                <SelectContent>
                  {timeSlots.length === 0
                    ? <SelectItem value="__closed" disabled>{t("form.gateClosed")}</SelectItem>
                    : timeSlots.map((ts) => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.duration")}</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("fields.vehicleType")}</label>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPE_VALUES.map((vt) => <SelectItem key={vt} value={vt}>{t(`vehicleType.${vt}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Driver info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.licensePlate")}</label>
              <Input placeholder="ABC 1234" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.sealNumbers")}</label>
              <Input value={sealNumbers} onChange={(e) => setSealNumbers(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.driverName")}</label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("fields.driverContact")}</label>
              <Input placeholder="+420 …" value={driverContact} onChange={(e) => setDriverContact(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("fields.notes")}</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-16 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={isPending || !startTime}>
              {isPending ? t("form.saving") : t("edit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
