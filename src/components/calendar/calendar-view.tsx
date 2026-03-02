"use client";

import FullCalendar from "@fullcalendar/react";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import scrollGridPlugin from "@fullcalendar/scrollgrid";
import type { EventContentArg, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { CalendarEvent, CalendarGate } from "@/lib/actions/calendar";
import type { ReservationStatus } from "@/generated/prisma/client";
import { useState, useCallback, useRef, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservationPopover } from "./reservation-popover";

const STATUS_COLORS: Record<ReservationStatus | "REQUESTED_PENDING", { bg: string; border: string; text: string }> = {
  REQUESTED: { bg: "#fef9c3", border: "#facc15", text: "#713f12" },
  CONFIRMED: { bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
  CANCELLED: { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" },
  UNLOADING_STARTED: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  UNLOADING_COMPLETED: { bg: "#e0e7ff", border: "#7c3aed", text: "#2e1065" },
  CLOSED: { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
  REQUESTED_PENDING: { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" },
};

type Props = {
  gates: CalendarGate[];
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (reservationId: string) => void;
  onSlotClick?: (gateId: string, date: Date, startTime: string) => void;
  loading?: boolean;
};

export function CalendarView({ gates, events, currentDate, onDateChange, onEventClick, onSlotClick, loading }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  // Sync FullCalendar date when currentDate prop changes
  useEffect(() => {
    calendarRef.current?.getApi().gotoDate(currentDate);
  }, [currentDate]);

  const resources = gates.map((g) => ({
    id: g.id,
    title: g.name,
  }));

  const fcEvents = events.map((e) => {
    const colors = STATUS_COLORS[e.status] ?? STATUS_COLORS.CONFIRMED;
    return {
      id: e.id,
      resourceId: e.resourceId,
      start: e.start,
      end: e.end,
      title: e.title,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: e,
    };
  });

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const ev = info.event.extendedProps as CalendarEvent;
      const rect = info.el.getBoundingClientRect();
      setSelectedEvent(ev);
      setPopoverAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY });
    },
    []
  );

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      if (!onSlotClick) return;
      const gateId = info.resource?.id;
      if (!gateId) return;
      const h = String(info.date.getHours()).padStart(2, "0");
      const m = String(info.date.getMinutes()).padStart(2, "0");
      onSlotClick(gateId, info.date, `${h}:${m}`);
    },
    [onSlotClick]
  );

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const ev = arg.event.extendedProps as CalendarEvent;
    return (
      <div className="px-1 py-0.5 overflow-hidden h-full flex flex-col">
        <span className="font-medium text-xs leading-tight truncate">{arg.event.title}</span>
        {ev.licensePlate && (
          <span className="text-[10px] opacity-75 truncate">{ev.licensePlate}</span>
        )}
      </div>
    );
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onDateChange(subDays(currentDate, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-medium min-w-36 text-center">
          {format(currentDate, "EEEE d. MMMM yyyy", { locale: cs })}
        </span>
        <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(currentDate, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
          Dnes
        </Button>
      </div>

      {/* Calendar */}
      <div className={`border rounded-lg overflow-hidden bg-background transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimeGridPlugin, interactionPlugin, scrollGridPlugin]}
          initialView="resourceTimeGridDay"
          initialDate={currentDate}
          resources={resources}
          events={fcEvents}
          slotDuration="00:15:00"
          slotMinTime="05:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          headerToolbar={false}
          height="auto"
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          resourceAreaWidth="120px"
          locale="cs"
          firstDay={1}
          nowIndicator
          stickyHeaderDates
        />
      </div>

      {/* Event popover */}
      {selectedEvent && popoverAnchor && (
        <ReservationPopover
          event={selectedEvent}
          anchor={popoverAnchor}
          onClose={() => setSelectedEvent(null)}
          onOpenDetail={() => {
            setSelectedEvent(null);
            onEventClick(selectedEvent.id.replace("pending-", ""));
          }}
        />
      )}
    </div>
  );
}
