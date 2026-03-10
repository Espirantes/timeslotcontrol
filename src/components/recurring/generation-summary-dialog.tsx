"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { SkippedInstance } from "@/lib/actions/recurring-reservations";

type Props = {
  open: boolean;
  onClose: () => void;
  created: number;
  skipped: SkippedInstance[];
};

function formatReason(reason: string, t: ReturnType<typeof useTranslations<"recurring">>): string {
  if (reason.startsWith("holiday:")) return `${t("generation.reasonHoliday")}: ${reason.slice(8)}`;
  if (reason.startsWith("blocked:")) return `${t("generation.reasonBlocked")}: ${reason.slice(8)}`;
  if (reason === "occupied") return t("generation.reasonOccupied");
  if (reason === "gate_closed") return t("generation.reasonGateClosed");
  return reason;
}

export function GenerationSummaryDialog({ open, onClose, created, skipped }: Props) {
  const t = useTranslations("recurring");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("generation.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">{t("generation.created")}:</span> {created}
          </p>

          {skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">{t("generation.skipped")}: {skipped.length}</p>
              <div className="max-h-48 overflow-y-auto border rounded-md">
                <table className="w-full text-xs">
                  <tbody>
                    {skipped.map((s, i) => (
                      <tr key={i} className="border-t first:border-t-0">
                        <td className="px-2 py-1 font-mono">{s.date}</td>
                        <td className="px-2 py-1 text-muted-foreground">{formatReason(s.reason, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
