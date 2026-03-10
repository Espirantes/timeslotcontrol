"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createGateBlock } from "@/lib/actions/admin";
import { format } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  gateId: string;
  gateName: string;
  preselectedDate: Date;
  preselectedStartTime?: string; // "HH:MM"
  onCreated: () => void;
};

export function BlockDialog({ open, onClose, gateId, gateName, preselectedDate, preselectedStartTime, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("gateBlock");
  const tCommon = useTranslations("common");

  const [date, setDate] = useState(format(preselectedDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(preselectedStartTime ?? "08:00");
  const [endTime, setEndTime] = useState(() => {
    if (preselectedStartTime) {
      const [h, m] = preselectedStartTime.split(":").map(Number);
      const endH = h + 1;
      return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "17:00";
  });
  const [reason, setReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(!preselectedStartTime);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;

    const startISO = isFullDay
      ? new Date(`${date}T00:00:00`).toISOString()
      : new Date(`${date}T${startTime}:00`).toISOString();
    const endISO = isFullDay
      ? new Date(`${date}T23:59:59`).toISOString()
      : new Date(`${date}T${endTime}:00`).toISOString();

    startTransition(async () => {
      try {
        await createGateBlock({ gateId, startTime: startISO, endTime: endISO, reason: reason.trim() });
        toast.success(t("created"));
        onCreated();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add")} — {gateName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("date")}</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="rounded"
            />
            {t("fullDay")}
          </label>

          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("startTime")}</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("endTime")}</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("reason")} *</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reason")}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={isPending || !reason.trim()}>
              {isPending ? tCommon("loading") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
