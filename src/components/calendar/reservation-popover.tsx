"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { CalendarEvent } from "@/lib/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X, ExternalLink, Check, XCircle, Repeat2, Building2, Truck, Container, Copy, CheckCheck } from "lucide-react";
import { statusKey } from "@/lib/reservation-utils";

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
  userRole?: string;
  onApprove?: (reservationId: string) => void;
  onReject?: (reservationId: string) => void;
};

export function ReservationPopover({ event, anchor, onClose, onOpenDetail, userRole, onApprove, onReject }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("reservation");
  const tRecurring = useTranslations("recurring");
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

  const [copied, setCopied] = useState(false);

  const canApprove = (userRole === "ADMIN" || userRole === "WAREHOUSE_WORKER")
    && event.status === "REQUESTED"
    && event.isOwn;

  const realId = event.id.replace("pending-", "");
  const startTime = format(new Date(event.start), "H:mm");
  const endTime = format(new Date(event.end), "H:mm");

  function copyInfo() {
    const lines = [
      event.reservationNumber ? `#${event.reservationNumber}` : "",
      event.clientName ? `${t("fields.client")}: ${event.clientName}` : "",
      event.supplierName ? `${t("fields.supplier")}: ${event.supplierName}` : "",
      event.carrierName ? `${t("fields.carrier")}: ${event.carrierName}` : "",
      `${startTime} – ${endTime}${event.durationMinutes ? ` (${event.durationMinutes} min)` : ""}`,
      event.licensePlate ? `${t("fields.licensePlate")}: ${event.licensePlate}` : "",
      event.driverName ? `${t("fields.driverName")}: ${event.driverName}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-4 w-80"
      style={{
        left: Math.min(anchor.x, window.innerWidth - 340),
        top: Math.min(anchor.y + 8, window.innerHeight - 320),
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {event.reservationNumber && (
            <span className="text-[10px] font-mono text-muted-foreground">#{event.reservationNumber}</span>
          )}
          {event.clientName && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{event.clientName}</span>
            </div>
          )}
          {event.supplierName && (
            <div className="flex items-center gap-1.5 font-semibold">
              <Truck className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{event.supplierName}</span>
            </div>
          )}
          {event.carrierName && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Container className="size-3 shrink-0" />
              <span className="truncate">{event.carrierName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {event.isOwn && (
            <button onClick={copyInfo} className="text-muted-foreground hover:text-foreground" title="Kopírovat">
              {copied ? <CheckCheck className="size-4 text-green-600" /> : <Copy className="size-4" />}
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {event.reservationType && (
          <Badge variant="outline" className="text-xs">
            {t(`reservationType.${event.reservationType}`)}
          </Badge>
        )}
        <Badge variant={STATUS_VARIANT[event.status] ?? "secondary"}>
          {t(`status.${statusKey(event.status, event.reservationType)}`)}
        </Badge>
        {event.isRecurring && (
          <Badge variant="outline" className="text-xs gap-0.5">
            <Repeat2 className="size-3" />
            {tRecurring("badge")}
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {startTime} – {endTime}
          {event.durationMinutes != null && ` (${event.durationMinutes} min)`}
        </span>
      </div>

      {event.isOwn && (
        <div className="space-y-1 text-sm mb-3">
          {event.vehicleType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("fields.vehicleType")}</span>
              <span className="font-medium">{t(`vehicleType.${event.vehicleType}`)}</span>
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
          {event.itemsCount != null && event.itemsCount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("items.title")}</span>
              <span className="font-medium">{event.itemsCount} ks</span>
            </div>
          )}
          {event.adviceCount != null && event.adviceCount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("advices.title")}</span>
              <span className="font-medium">{event.adviceCount}</span>
            </div>
          )}
          {event.notes && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">{t("fields.notes")}</span>
              <span className="font-medium text-right truncate">{event.notes}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {canApprove && onApprove && onReject && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onApprove(realId)}
            >
              <Check className="size-3" />
              {t("approval.approveNew")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 gap-1"
              onClick={() => onReject(realId)}
            >
              <XCircle className="size-3" />
              {tCommon("reject")}
            </Button>
          </div>
        )}
        {event.isOwn && (
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={onOpenDetail}>
            <ExternalLink className="size-3" />
            {tCommon("detail")}
          </Button>
        )}
      </div>
    </div>
  );
}
