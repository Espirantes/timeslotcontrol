"use client";

import FullCalendar from "@fullcalendar/react";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import scrollGridPlugin from "@fullcalendar/scrollgrid";
import type { EventContentArg, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { CalendarEvent, CalendarGate, CalendarBlock } from "@/lib/actions/calendar";
import type { ReservationStatus } from "@/generated/prisma/client";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { format, addDays, subDays, type Locale } from "date-fns";
import { cs } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { it } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, X, Repeat2 } from "lucide-react";
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

const BLOCK_COLORS = { bg: "#e5e7eb", border: "#9ca3af", text: "#374151" };

type Props = {
  gates: CalendarGate[];
  events: CalendarEvent[];
  blocks?: CalendarBlock[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (reservationId: string) => void;
  onSlotClick?: (gateId: string, date: Date, startTime: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  loading?: boolean;
  userRole?: string;
  onApprove?: (reservationId: string) => void;
  onReject?: (reservationId: string) => void;
  holidayName?: string;
};

const DATE_LOCALES: Record<string, Locale> = { cs, en: enUS, it };

export function CalendarView({ gates, events, blocks, currentDate, onDateChange, onEventClick, onSlotClick, onDeleteBlock, loading, userRole, onApprove, onReject, holidayName }: Props) {
  const locale = useLocale();
  const t = useTranslations("reservation");
  const tBlock = useTranslations("gateBlock");
  const tCommon = useTranslations("common");
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  // Sync FullCalendar date when currentDate prop changes
  useEffect(() => {
    calendarRef.current?.getApi().gotoDate(currentDate);
  }, [currentDate]);

  const resources = useMemo(() => gates.map((g, i) => ({
    id: g.id,
    title: g.name,
    order: i,
  })), [gates]);

  const fcEvents = useMemo(() => [
    ...events.map((e) => {
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
        extendedProps: { ...e, _type: "event" as const },
      };
    }),
    ...(blocks ?? []).map((b) => ({
      id: `block-${b.id}`,
      resourceId: b.gateId,
      start: b.start,
      end: b.end,
      title: b.reason,
      backgroundColor: BLOCK_COLORS.bg,
      borderColor: BLOCK_COLORS.border,
      textColor: BLOCK_COLORS.text,
      extendedProps: { ...b, _type: "block" as const },
    })),
  ], [events, blocks]);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const props = info.event.extendedProps;
      const rect = info.el.getBoundingClientRect();
      const anchor = { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY };

      if (props._type === "block") {
        setSelectedBlock(props as unknown as CalendarBlock);
        setSelectedEvent(null);
        setPopoverAnchor(anchor);
      } else {
        setSelectedEvent(props as unknown as CalendarEvent);
        setSelectedBlock(null);
        setPopoverAnchor(anchor);
      }
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
    const props = arg.event.extendedProps;
    if (props._type === "block") {
      return (
        <div className="px-1 py-0.5 overflow-hidden h-full flex flex-col bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]">
          <span className="font-medium text-xs leading-tight truncate">{arg.event.title}</span>
        </div>
      );
    }
    const ev = props as CalendarEvent;
    return (
      <div className="px-1 py-0.5 overflow-hidden h-full flex flex-col">
        <span className="font-medium text-xs leading-tight truncate flex items-center gap-0.5">
          {ev.isRecurring && <Repeat2 className="size-3 shrink-0 opacity-60" />}
          {arg.event.title}
        </span>
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
          {format(currentDate, "EEEE d. MMMM yyyy", { locale: DATE_LOCALES[locale] ?? enUS })}
        </span>
        <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(currentDate, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
          {t("calendar.today")}
        </Button>
      </div>

      {/* Holiday banner */}
      {holidayName && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <span className="font-medium">{holidayName}</span>
        </div>
      )}

      {/* Calendar */}
      <div className={`border rounded-lg overflow-hidden bg-background transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimeGridPlugin, interactionPlugin, scrollGridPlugin]}
          initialView="resourceTimeGridDay"
          initialDate={currentDate}
          resources={resources}
          resourceOrder="order"
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
          locale={locale}
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
          userRole={userRole}
          onApprove={onApprove ? (id) => { onApprove(id); setSelectedEvent(null); } : undefined}
          onReject={onReject ? (id) => { onReject(id); setSelectedEvent(null); } : undefined}
        />
      )}

      {/* Block popover */}
      {selectedBlock && popoverAnchor && (
        <BlockPopover
          block={selectedBlock}
          anchor={popoverAnchor}
          onClose={() => setSelectedBlock(null)}
          onDelete={onDeleteBlock ? () => {
            onDeleteBlock(selectedBlock.id);
            setSelectedBlock(null);
          } : undefined}
          reasonLabel={tBlock("reason")}
          deleteLabel={tBlock("delete")}
          closeLabel={tCommon("close")}
        />
      )}
    </div>
  );
}

// ─── Block Popover (inline) ───────────────────────────────────────────────────

function BlockPopover({ block, anchor, onClose, onDelete, reasonLabel, deleteLabel, closeLabel }: {
  block: CalendarBlock;
  anchor: { x: number; y: number };
  onClose: () => void;
  onDelete?: () => void;
  reasonLabel: string;
  deleteLabel: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const startTime = format(new Date(block.start), "H:mm");
  const endTime = format(new Date(block.end), "H:mm");

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-4 w-72"
      style={{ left: Math.min(anchor.x, window.innerWidth - 300), top: anchor.y + 8 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm">{block.reason}</p>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {startTime} – {endTime}
      </p>
      {onDelete && (
        <Button size="sm" variant="destructive" className="w-full gap-1" onClick={onDelete}>
          <Trash2 className="size-3" /> {deleteLabel}
        </Button>
      )}
    </div>
  );
}
