"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Power, Trash2, RefreshCw } from "lucide-react";
import { RecurringFormDialog } from "./recurring-form-dialog";
import { GenerationSummaryDialog } from "./generation-summary-dialog";
import {
  deactivateRecurringReservation,
  cancelFutureInstances,
  manuallyGenerateInstances,
} from "@/lib/actions/recurring-reservations";
import type { RecurringReservationListItem, GenerationResult } from "@/lib/actions/recurring-reservations";

type Warehouse = { id: string; name: string };

type Props = {
  items: RecurringReservationListItem[];
  warehouses: Warehouse[];
};

export function RecurringListClient({ items: initialItems, warehouses }: Props) {
  const router = useRouter();
  const t = useTranslations("recurring");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryResult, setSummaryResult] = useState<GenerationResult | null>(null);

  function handleCreated() {
    router.refresh();
  }

  function handleDeactivate(id: string) {
    if (!confirm(t("actions.confirmDeactivate"))) return;
    startTransition(async () => {
      try {
        await deactivateRecurringReservation(id);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: false } : i)));
        toast.success(tCommon("success"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  function handleCancelFuture(id: string) {
    if (!confirm(t("actions.confirmCancelFuture"))) return;
    startTransition(async () => {
      try {
        const result = await cancelFutureInstances(id);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: false } : i)));
        toast.success(`${tCommon("success")} (${result.cancelledCount})`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  function handleGenerateMore(id: string) {
    startTransition(async () => {
      try {
        const result = await manuallyGenerateInstances(id, 30);
        setSummaryResult(result);
        setSummaryOpen(true);
        toast.success(tCommon("success"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  const defaultWarehouseId = warehouses[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-1" /> {t("new")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("list.empty")}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{t("list.colGateClient")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("list.colRecurrence")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("list.colValidity")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("list.colStatus")}</th>
                <th className="text-right px-4 py-2 font-medium">{t("list.colInstances")}</th>
                <th className="text-right px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className={`${isPending ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.gateName}</div>
                    <div className="text-xs text-muted-foreground">{item.clientName} → {item.supplierName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{item.recurrenceSummary}</span>
                    <div className="text-xs text-muted-foreground">{item.durationMinutes} min</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.startDate}
                    {item.endDate ? ` – ${item.endDate}` : ` – ∞`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{item.instanceCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.isActive && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title={t("actions.generateMore")}
                            onClick={() => handleGenerateMore(item.id)}
                            disabled={isPending}
                          >
                            <RefreshCw className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title={t("actions.deactivate")}
                            onClick={() => handleDeactivate(item.id)}
                            disabled={isPending}
                          >
                            <Power className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            title={t("actions.cancelFuture")}
                            onClick={() => handleCancelFuture(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecurringFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        warehouseId={defaultWarehouseId}
        onCreated={handleCreated}
      />

      {summaryResult && (
        <GenerationSummaryDialog
          open={summaryOpen}
          onClose={() => {
            setSummaryOpen(false);
            setSummaryResult(null);
          }}
          created={summaryResult.created}
          skipped={summaryResult.skipped}
        />
      )}
    </div>
  );
}
