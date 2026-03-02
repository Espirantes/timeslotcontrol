"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { CalendarEvent } from "@/lib/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  UNLOADING_STARTED: "default",
  UNLOADING_COMPLETED: "default",
  CLOSED: "outline",
};

type Props = {
  event: CalendarEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
  onOpenDetail: () => void;
};

export function ReservationPopover({ event, anchor, onClose, onOpenDetail }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-4 w-72"
      style={{ left: Math.min(anchor.x, window.innerWidth - 300), top: anchor.y + 8 }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{event.supplierName ?? event.title}</p>
          {event.clientName && (
            <p className="text-sm text-muted-foreground truncate">{event.clientName}</p>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <Badge variant={STATUS_VARIANT[event.status] ?? "secondary"} className="mb-3">
        {t(`status.${event.status}`)}
      </Badge>

      {event.isOwn && (
        <div className="space-y-1 text-sm mb-3">
          {event.vehicleType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("fields.vehicleType")}</span>
              <span className="font-medium">{event.vehicleType}</span>
            </div>
          )}
          {event.licensePlate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("fields.licensePlate")}</span>
              <span className="font-mono font-medium">{event.licensePlate}</span>
            </div>
          )}
          {event.driverName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("fields.driverName")}</span>
              <span className="font-medium">{event.driverName}</span>
            </div>
          )}
        </div>
      )}

      {event.isOwn && (
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={onOpenDetail}>
          <ExternalLink className="size-3" />
          {tCommon("detail")}
        </Button>
      )}
    </div>
  );
}
