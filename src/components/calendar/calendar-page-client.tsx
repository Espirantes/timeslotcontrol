"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarView } from "./calendar-view";
import { getCalendarData } from "@/lib/actions/calendar";
import type { CalendarEvent, CalendarGate } from "@/lib/actions/calendar";
import { startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Warehouse = { id: string; name: string };

type Props = {
  warehouses: Warehouse[];
  defaultWarehouseId: string;
};

export function CalendarPageClient({ warehouses, defaultWarehouseId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gates, setGates] = useState<CalendarGate[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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
    router.push(`/dashboard/reservations/${reservationId}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {warehouses.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sklad:</span>
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
      )}

      <CalendarView
        gates={gates}
        events={events}
        currentDate={currentDate}
        onDateChange={handleDateChange}
        onEventClick={handleEventClick}
        loading={isPending}
      />
    </div>
  );
}
