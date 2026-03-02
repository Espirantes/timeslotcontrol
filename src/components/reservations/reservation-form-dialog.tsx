"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createReservation, getFormData } from "@/lib/actions/reservations";
import type { VehicleType, TransportUnitType } from "@/generated/prisma/client";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "TRUCK", label: "Kamion" },
  { value: "VAN", label: "Avie / dodávka" },
  { value: "TRUCK_DOUBLE_TRAILER", label: "Kamion s dvěma návěsy" },
  { value: "TRUCK_CURTAINSIDER", label: "Kamion plachta" },
  { value: "REFRIGERATED_TRUCK", label: "Chladírenský kamion" },
  { value: "OTHER", label: "Ostatní" },
];

const UNIT_TYPES: { value: TransportUnitType; label: string }[] = [
  { value: "PALLET_EUR", label: "Paleta EUR" },
  { value: "PALLET_ONE_WAY", label: "Paleta jednocestná" },
  { value: "PALLET_OTHER", label: "Paleta ostatní" },
  { value: "CARTON", label: "Karton" },
  { value: "OTHER", label: "Ostatní" },
];

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemRow = {
  unitType: TransportUnitType;
  quantity: number;
  weightKg: string;
  description: string;
};

type GateHours = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
};

type Gate = { id: string; name: string; openingHours: GateHours[] };
type Client = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  preselectedGateId?: string;
  preselectedDate?: Date;
  preselectedStartTime?: string; // "HH:MM"
  onCreated?: (reservationId: string) => void;
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

function getAvailableSlots(gate: Gate | undefined, date: Date): string[] {
  if (!gate) return [];
  const dayOfWeek = date.getDay();
  const hours = gate.openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) return [];
  return generateTimeSlots(hours.openTime, hours.closeTime);
}

function defaultItem(): ItemRow {
  return { unitType: "PALLET_EUR", quantity: 1, weightKg: "", description: "" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReservationFormDialog({
  open, onClose, warehouseId, preselectedGateId, preselectedDate, preselectedStartTime, onCreated,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Form data from server
  const [gates, setGates] = useState<Gate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Form state
  const [gateId, setGateId] = useState(preselectedGateId ?? "");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(preselectedDate ? format(preselectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(preselectedStartTime ?? "");
  const [duration, setDuration] = useState(60);
  const [vehicleType, setVehicleType] = useState<VehicleType>("TRUCK");
  const [licensePlate, setLicensePlate] = useState("");
  const [sealNumbers, setSealNumbers] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([defaultItem()]);

  // Load form data when dialog opens
  useEffect(() => {
    if (!open) return;
    getFormData(warehouseId).then((data) => {
      setGates(data.gates);
      setClients(data.clients);
      if (!gateId && data.gates.length > 0) setGateId(data.gates[0].id);
      if (!clientId && data.clients.length > 0) setClientId(data.clients[0].id);
    });
  }, [open, warehouseId]);

  // Sync preselected values when props change
  useEffect(() => {
    if (preselectedGateId) setGateId(preselectedGateId);
    if (preselectedDate) setDate(format(preselectedDate, "yyyy-MM-dd"));
    if (preselectedStartTime) setStartTime(preselectedStartTime);
  }, [preselectedGateId, preselectedDate, preselectedStartTime]);

  const selectedGate = gates.find((g) => g.id === gateId);
  const timeSlots = getAvailableSlots(selectedGate, new Date(date + "T12:00:00"));

  function addItem() { setItems((prev) => [...prev, defaultItem()]); }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gateId || !clientId || !startTime) {
      toast.error("Vyplňte všechna povinná pole");
      return;
    }

    const startISO = new Date(`${date}T${startTime}:00`).toISOString();

    startTransition(async () => {
      try {
        const result = await createReservation({
          gateId,
          clientId,
          startTime: startISO,
          durationMinutes: duration,
          vehicleType,
          licensePlate: licensePlate || undefined,
          sealNumbers: sealNumbers || undefined,
          driverName: driverName || undefined,
          driverContact: driverContact || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            unitType: item.unitType,
            quantity: Number(item.quantity),
            weightKg: item.weightKg ? Number(item.weightKg) : null,
            description: item.description || null,
          })),
        });

        toast.success("Rezervace zažádána — čeká na schválení");
        onCreated?.(result.reservationId);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chyba při vytváření rezervace");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nová rezervace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Row 1: Gate + Client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Rampa *</label>
              <Select value={gateId} onValueChange={setGateId}>
                <SelectTrigger><SelectValue placeholder="Vyberte rampu" /></SelectTrigger>
                <SelectContent>
                  {gates.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Klient *</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Vyberte klienta" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Datum *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Čas začátku *</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue placeholder="Vyberte čas" /></SelectTrigger>
                <SelectContent>
                  {timeSlots.length === 0
                    ? <SelectItem value="" disabled>Rampa zavřena</SelectItem>
                    : timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Délka</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Vehicle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Typ vozidla *</label>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((vt) => <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Row 4: Driver info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">SPZ</label>
              <Input placeholder="ABC 1234" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Plomby</label>
              <Input placeholder="č. plomby" value={sealNumbers} onChange={(e) => setSealNumbers(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Jméno řidiče</label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Kontakt na řidiče</label>
              <Input placeholder="+420 …" value={driverContact} onChange={(e) => setDriverContact(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Poznámky</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none min-h-16 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Transport items */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Přepravní jednotky</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3 mr-1" /> Přidat řádek
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Typ</th>
                    <th className="text-left px-2 py-1.5 font-medium w-20">Počet</th>
                    <th className="text-left px-2 py-1.5 font-medium w-24">Hmot. (kg)</th>
                    <th className="text-left px-2 py-1.5 font-medium">Popis</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">
                        <Select value={item.unitType} onValueChange={(v) => updateItem(i, "unitType", v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNIT_TYPES.map((ut) => <SelectItem key={ut.value} value={ut.value}>{ut.label}</SelectItem>)}
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
                          value={item.weightKg}
                          onChange={(e) => updateItem(i, "weightKg", e.target.value)}
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Zrušit</Button>
            <Button type="submit" disabled={isPending || !startTime || !gateId || !clientId}>
              {isPending ? "Ukládám…" : "Zažádat o rezervaci"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
