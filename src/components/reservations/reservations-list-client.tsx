"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { format, type Locale } from "date-fns";
import { cs } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { it } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

const DATE_LOCALES: Record<string, Locale> = { cs, en: enUS, it };
import { Check, X, ChevronRight, Clock, AlertCircle, Filter, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
        <div className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" />
          <span>{r.warehouseName}</span>
        </div>
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

// ─── Filters ───────────────────────────────────────────────────────────────────

type Filters = {
  warehouse: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

function FilterBar({
  filters,
  onChange,
  warehouses,
  statuses,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  warehouses: { id: string; name: string }[];
  statuses: string[];
}) {
  const t = useTranslations("reservation");

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border rounded-lg">
      <Filter className="size-4 text-muted-foreground shrink-0" />
      {warehouses.length > 1 && (
        <Select value={filters.warehouse} onValueChange={(v) => onChange({ ...filters, warehouse: v })}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder={t("list.filterWarehouse")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.filterAll")}</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder={t("list.filterStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("list.filterAll")}</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="h-8 w-36 text-xs"
        value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
      />
      <span className="text-muted-foreground text-xs">—</span>
      <Input
        type="date"
        className="h-8 w-36 text-xs"
        value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
      />
      {(filters.warehouse !== "all" || filters.status !== "all" || filters.dateFrom || filters.dateTo) && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => onChange({ warehouse: "all", status: "all", dateFrom: "", dateTo: "" })}
        >
          <X className="size-3.5 mr-1" />
          {t("list.filterClear")}
        </Button>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReservationsListClient({ reservations, role }: Props) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [filters, setFilters] = useState<Filters>({ warehouse: "all", status: "all", dateFrom: "", dateTo: "" });
  const t = useTranslations("reservation");

  const canApprove = role === "ADMIN" || role === "WAREHOUSE_WORKER";
  const pending = reservations.filter((r) => r.hasPendingVersion);

  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    reservations.forEach((r) => map.set(r.warehouseId, r.warehouseName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reservations]);

  const statuses = useMemo(() => [...new Set(reservations.map((r) => r.status))], [reservations]);

  const filtered = useMemo(() => {
    const base = tab === "pending" ? pending : reservations;
    return base.filter((r) => {
      if (filters.warehouse !== "all" && r.warehouseId !== filters.warehouse) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (new Date(r.startTime) < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(r.startTime) > to) return false;
      }
      return true;
    });
  }, [reservations, pending, tab, filters]);

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

      <FilterBar
        filters={filters}
        onChange={setFilters}
        warehouses={warehouses}
        statuses={statuses}
      />

      {filtered.length === 0 ? (
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
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colWarehouse")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colTime")}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t("list.colSupplier")}</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
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
