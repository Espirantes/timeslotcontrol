"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarView } from "./calendar-view";
import { ReservationFormDialog } from "@/components/reservations/reservation-form-dialog";
import { getCalendarData } from "@/lib/actions/calendar";
import { approveReservation, rejectReservation } from "@/lib/actions/reservations";
import type { CalendarEvent, CalendarGate } from "@/lib/actions/calendar";
import { startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Warehouse = { id: string; name: string };

type Props = {
  warehouses: Warehouse[];
  defaultWarehouseId: string;
  userRole: string;
};

export function CalendarPageClient({ warehouses, defaultWarehouseId, userRole }: Props) {
  const router = useRouter();
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gates, setGates] = useState<CalendarGate[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectedGateId, setPreselectedGateId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();
  const [preselectedStartTime, setPreselectedStartTime] = useState<string | undefined>();

  async function loadData(wId: string, date: Date) {
    startTransition(async () => {
      const data = await getCalendarData(wId, startOfDay(date), endOfDay(date));
      setGates(data.gates);
      setEvents(data.events);
    });
  }

  useEffect(() => {
    loadData(warehouseId, currentDate);
  }, [warehouseId, currentDate]);

  function handleWarehouseChange(val: string) {
    setWarehouseId(val);
  }

  function handleDateChange(date: Date) {
    setCurrentDate(date);
  }

  function handleEventClick(reservationId: string) {
    router.push(`/reservations/${reservationId}`);
  }

  function handleSlotClick(gateId: string, date: Date, startTime: string) {
    setPreselectedGateId(gateId);
    setPreselectedDate(date);
    setPreselectedStartTime(startTime);
    setDialogOpen(true);
  }

  function handleNewReservation() {
    setPreselectedGateId(undefined);
    setPreselectedDate(currentDate);
    setPreselectedStartTime(undefined);
    setDialogOpen(true);
  }

  function handleCreated() {
    loadData(warehouseId, currentDate);
  }

  async function handleApprove(reservationId: string) {
    startTransition(async () => {
      try {
        await approveReservation(reservationId);
        toast.success(tCommon("success"));
        loadData(warehouseId, currentDate);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  async function handleReject(reservationId: string) {
    startTransition(async () => {
      try {
        await rejectReservation(reservationId);
        toast.success(tCommon("success"));
        loadData(warehouseId, currentDate);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {warehouses.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{tNav("groupWarehouse")}:</span>
            <Select value={warehouseId} onValueChange={handleWarehouseChange}>
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={handleNewReservation}>
          <Plus className="size-4 mr-1" /> {t("form.createTitle")}
        </Button>
      </div>

      <CalendarView
        gates={gates}
        events={events.map((e) => ({
          ...e,
          title: e.isOwn
            ? e.status === "REQUESTED" ? `${e.supplierName} ${t("calendar.pendingSuffix")}` : e.supplierName ?? e.title
            : e.status === "REQUESTED" ? t("calendar.pending") : t("calendar.booked"),
        }))}
        currentDate={currentDate}
        onDateChange={handleDateChange}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
        loading={isPending}
        userRole={userRole}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <ReservationFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        warehouseId={warehouseId}
        preselectedGateId={preselectedGateId}
        preselectedDate={preselectedDate}
        preselectedStartTime={preselectedStartTime}
        onCreated={handleCreated}
      />
    </div>
  );
}
