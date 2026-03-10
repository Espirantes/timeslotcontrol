"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const CalendarView = dynamic(() => import("./calendar-view").then((m) => m.CalendarView), { ssr: false });
import { ReservationFormDialog } from "@/components/reservations/reservation-form-dialog";
import { BlockDialog } from "./block-dialog";
import { getCalendarData } from "@/lib/actions/calendar";
import { deleteGateBlock } from "@/lib/actions/admin";
import { approveReservation, rejectReservation } from "@/lib/actions/reservations";
import type { CalendarEvent, CalendarGate, CalendarHoliday, CalendarBlock } from "@/lib/actions/calendar";
import { startOfDay, endOfDay, format } from "date-fns";
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
  const tBlock = useTranslations("gateBlock");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gates, setGates] = useState<CalendarGate[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);

  // Reservation dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectedGateId, setPreselectedGateId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>();
  const [preselectedStartTime, setPreselectedStartTime] = useState<string | undefined>();

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockGateId, setBlockGateId] = useState("");
  const [blockGateName, setBlockGateName] = useState("");
  const [blockDate, setBlockDate] = useState(new Date());
  const [blockStartTime, setBlockStartTime] = useState<string | undefined>();

  // Slot click action picker
  const [actionPickerOpen, setActionPickerOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ gateId: string; date: Date; startTime: string } | null>(null);

  const canManageBlocks = userRole === "ADMIN" || userRole === "WAREHOUSE_WORKER";

  async function loadData(wId: string, date: Date, signal?: AbortSignal) {
    startTransition(async () => {
      const data = await getCalendarData(wId, startOfDay(date), endOfDay(date));
      if (signal?.aborted) return;
      setGates(data.gates);
      setEvents(data.events);
      setHolidays(data.holidays);
      setBlocks(data.blocks);
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(warehouseId, currentDate, controller.signal);
    return () => controller.abort();
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
    if (canManageBlocks) {
      setPendingSlot({ gateId, date, startTime });
      setActionPickerOpen(true);
    } else {
      openReservationDialog(gateId, date, startTime);
    }
  }

  function openReservationDialog(gateId: string, date: Date, startTime: string) {
    setPreselectedGateId(gateId);
    setPreselectedDate(date);
    setPreselectedStartTime(startTime);
    setDialogOpen(true);
  }

  function openBlockDialog(gateId: string, date: Date, startTime: string) {
    const gate = gates.find((g) => g.id === gateId);
    setBlockGateId(gateId);
    setBlockGateName(gate?.name ?? "");
    setBlockDate(date);
    setBlockStartTime(startTime);
    setBlockDialogOpen(true);
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

  async function handleDeleteBlock(blockId: string) {
    startTransition(async () => {
      try {
        await deleteGateBlock(blockId);
        toast.success(tBlock("deleted"));
        loadData(warehouseId, currentDate);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
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

  const mappedEvents = useMemo(() => events.map((e) => ({
    ...e,
    isRecurring: e.isRecurring,
    title: e.isOwn
      ? e.status === "REQUESTED" ? `${e.supplierName} ${t("calendar.pendingSuffix")}` : e.supplierName ?? e.title
      : e.status === "REQUESTED" ? t("calendar.pending") : t("calendar.booked"),
  })), [events, t]);

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
        holidayName={holidays.find((h) => h.date === format(currentDate, "yyyy-MM-dd"))?.name}
        events={mappedEvents}
        blocks={blocks}
        currentDate={currentDate}
        onDateChange={handleDateChange}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
        onDeleteBlock={canManageBlocks ? handleDeleteBlock : undefined}
        loading={isPending}
        userRole={userRole}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Slot click action picker for admin/worker */}
      {actionPickerOpen && pendingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setActionPickerOpen(false)}
        >
          <div
            className="bg-popover border rounded-lg shadow-lg p-4 w-64 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-1">{tBlock("selectAction")}</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setActionPickerOpen(false);
                openReservationDialog(pendingSlot.gateId, pendingSlot.date, pendingSlot.startTime);
              }}
            >
              <Plus className="size-3 mr-1" /> {tBlock("newReservation")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setActionPickerOpen(false);
                openBlockDialog(pendingSlot.gateId, pendingSlot.date, pendingSlot.startTime);
              }}
            >
              {tBlock("blockGate")}
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setActionPickerOpen(false)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}

      <ReservationFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        warehouseId={warehouseId}
        preselectedGateId={preselectedGateId}
        preselectedDate={preselectedDate}
        preselectedStartTime={preselectedStartTime}
        onCreated={handleCreated}
      />

      <BlockDialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        gateId={blockGateId}
        gateName={blockGateName}
        preselectedDate={blockDate}
        preselectedStartTime={blockStartTime}
        onCreated={handleCreated}
      />
    </div>
  );
}
