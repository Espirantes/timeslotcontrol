"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { format, type Locale } from "date-fns";
import { cs } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { it } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

const DATE_LOCALES: Record<string, Locale> = { cs, en: enUS, it };
import { Check, X, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveReservation, rejectReservation } from "@/lib/actions/reservations";
import type { ReservationListItem } from "@/lib/actions/reservations";
import type { UserRole } from "@/generated/prisma/client";
import { statusKey } from "@/lib/reservation-utils";

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  UNLOADING_STARTED: "default",
  UNLOADING_COMPLETED: "default",
  CLOSED: "outline",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  reservations: ReservationListItem[];
  role: UserRole;
};

// ─── Row ───────────────────────────────────────────────────────────────────────

function ReservationRow({
  r,
  canApprove,
  onApproved,
}: {
  r: ReservationListItem;
  canApprove: boolean;
  onApproved: () => void;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveReservation(r.id);
        toast.success(t("approval.approveNew"));
        onApproved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectReservation(r.id);
        toast.success(t("approval.rejectNew"));
        onApproved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  const displayTime = r.startTime
    ? format(new Date(r.startTime), "d. M. yyyy HH:mm", { locale: DATE_LOCALES[locale] ?? enUS })
    : "—";

  return (
    <tr className={`border-t hover:bg-muted/30 transition-colors ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {t(`reservationType.${r.reservationType}`)}
          </Badge>
          <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
            {t(`status.${statusKey(r.status, r.reservationType)}`)}
          </Badge>
          {r.hasPendingVersion && r.status !== "REQUESTED" && (
            <Badge variant="secondary" className="gap-1 text-amber-700 bg-amber-100 border-amber-300">
              <AlertCircle className="size-3" />
              {t("approval.pendingChange")}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium">{r.gateName}</div>
        <div className="text-muted-foreground text-xs">{r.clientName}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="size-3.5 text-muted-foreground" />
          {displayTime}
        </div>
        <div className="text-muted-foreground text-xs">{r.durationMinutes} min</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div>{r.supplierName}</div>
        {r.licensePlate && (
          <div className="text-muted-foreground text-xs">{r.licensePlate}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {canApprove && r.hasPendingVersion && (
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={handleApprove} disabled={isPending}>
                <Check className="size-3.5" /> {tCommon("confirm")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleReject} disabled={isPending}>
                <X className="size-3.5" /> {tCommon("reject")}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => router.push(`/reservations/${r.id}`)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReservationsListClient({ reservations, role }: Props) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const t = useTranslations("reservation");

  const canApprove = role === "ADMIN" || role === "WAREHOUSE_WORKER";
  const pending = reservations.filter((r) => r.hasPendingVersion);
  const displayed = tab === "pending" ? pending : reservations;

  const router = useRouter();
  function handleActionDone() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canApprove && (
        <div className="flex gap-1 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("pending")}
          >
            {t("list.tabPending")}
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">{pending.length}</span>
            )}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("all")}
          >
            {t("list.tabAll")} ({reservations.length})
          </button>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {tab === "pending" ? t("list.noPending") : t("list.noReservations")}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colStatus")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colGateClient")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colTime")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colSupplier")}</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <ReservationRow
                  key={r.id}
                  r={r}
                  canApprove={canApprove}
                  onApproved={handleActionDone}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
