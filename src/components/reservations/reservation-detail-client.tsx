"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ArrowLeft,
  Check,
  X,
  Play,
  Square,
  Lock,
  Ban,
  Clock,
  Truck,
  User,
  Phone,
  StickyNote,
  Package,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  approveReservation,
  rejectReservation,
  updateReservationStatus,
} from "@/lib/actions/reservations";
import type { ReservationDetail, ReservationVersionDetail } from "@/lib/actions/reservations";
import type { UserRole } from "@/generated/prisma/client";
import { ReservationEditDialog } from "./reservation-edit-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  UNLOADING_STARTED: "default",
  UNLOADING_COMPLETED: "default",
  CLOSED: "outline",
};

type Props = {
  reservation: ReservationDetail;
  role: UserRole;
};

export function ReservationDetailClient({ reservation: r, role }: Props) {
  const router = useRouter();
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const isWorker = role === "ADMIN" || role === "WAREHOUSE_WORKER";
  const displayVersion = r.confirmedVersion ?? r.pendingVersion;
  const [editOpen, setEditOpen] = useState(false);

  // REQUESTED: supplier can edit their pending request
  // CONFIRMED: anyone can edit if no pending change exists
  const canEdit =
    (r.status === "REQUESTED" && !!r.pendingVersion) ||
    (r.status === "CONFIRMED" && !!r.confirmedVersion && !r.pendingVersion);

  function handleAction(action: () => Promise<{ success: boolean }>, successMsg: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMsg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/reservations")} className="gap-1">
          <ArrowLeft className="size-4" />
          {tCommon("back")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")} — {tCommon("detail")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.warehouseName} · {r.gateName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {tCommon("edit")}
            </Button>
          )}
          <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-sm px-3 py-1">
            {t(`status.${r.status}`)}
          </Badge>
        </div>
      </div>

      {/* Pending change alert */}
      {r.pendingVersion && r.confirmedVersion && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertCircle className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{t("approval.pendingChange")}</p>
          </div>
          {isWorker && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                disabled={isPending}
                onClick={() => handleAction(() => approveReservation(r.id), t("approval.approveChange"))}
              >
                <Check className="size-3.5" /> {tCommon("confirm")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={isPending}
                onClick={() => handleAction(() => rejectReservation(r.id), t("approval.rejectChange"))}
              >
                <X className="size-3.5" /> {tCommon("reject")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main info */}
      {displayVersion && (
        <VersionCard version={displayVersion} t={t} label={r.confirmedVersion ? undefined : t("approval.pendingChange")} />
      )}

      {/* Pending version diff (when there's also a confirmed one) */}
      {r.pendingVersion && r.confirmedVersion && (
        <VersionCard version={r.pendingVersion} t={t} label={t("approval.pendingChange")} pending />
      )}

      {/* Meta info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("fields.client")}</span>
              <p className="font-medium">{r.clientName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("fields.supplier")}</span>
              <p className="font-medium">{r.supplierName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("fields.createdAt")}</span>
              <p className="font-medium">{format(new Date(r.createdAt), "d. M. yyyy HH:mm", { locale: cs })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("fields.updatedAt")}</span>
              <p className="font-medium">{format(new Date(r.updatedAt), "d. M. yyyy HH:mm", { locale: cs })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status actions */}
      {isWorker && (
        <StatusActions
          status={r.status}
          hasPending={!!r.pendingVersion && !r.confirmedVersion}
          isPending={isPending}
          onAction={handleAction}
          reservationId={r.id}
          t={t}
          tCommon={tCommon}
        />
      )}

      {/* Edit dialog */}
      {canEdit && (
        <ReservationEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          reservation={r}
          warehouseId={r.warehouseId}
          onEdited={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Version Card ──────────────────────────────────────────────────────────────

function VersionCard({
  version: v,
  t,
  label,
  pending,
}: {
  version: ReservationVersionDetail;
  t: ReturnType<typeof useTranslations<"reservation">>;
  label?: string;
  pending?: boolean;
}) {
  return (
    <Card className={pending ? "border-amber-300 bg-amber-50/50" : undefined}>
      {label && pending && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
            <AlertCircle className="size-4" />
            {t("approval.pendingChange")}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={label && pending ? "pt-0" : "pt-6"}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-muted-foreground">{t("fields.startTime")}</span>
              <p className="font-medium">{format(new Date(v.startTime), "d. M. yyyy HH:mm", { locale: cs })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-muted-foreground">{t("fields.duration")}</span>
              <p className="font-medium">{v.durationMinutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-muted-foreground">{t("fields.vehicleType")}</span>
              <p className="font-medium">{t(`vehicleType.${v.vehicleType}`)}</p>
            </div>
          </div>
          {v.licensePlate && (
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">{t("fields.licensePlate")}</span>
                <p className="font-mono font-medium">{v.licensePlate}</p>
              </div>
            </div>
          )}
          {v.sealNumbers && (
            <div>
              <span className="text-muted-foreground">{t("fields.sealNumbers")}</span>
              <p className="font-mono font-medium">{v.sealNumbers}</p>
            </div>
          )}
          {v.driverName && (
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">{t("fields.driverName")}</span>
                <p className="font-medium">{v.driverName}</p>
              </div>
            </div>
          )}
          {v.driverContact && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">{t("fields.driverContact")}</span>
                <p className="font-medium">{v.driverContact}</p>
              </div>
            </div>
          )}
        </div>

        {v.notes && (
          <>
            <Separator className="my-4" />
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground">{t("fields.notes")}</span>
                <p className="mt-1">{v.notes}</p>
              </div>
            </div>
          </>
        )}

        {v.items.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("items.title")}</span>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t("items.unitType")}</th>
                    <th className="text-right px-3 py-2 font-medium">{t("items.quantity")}</th>
                    <th className="text-right px-3 py-2 font-medium">{t("items.goodsWeightKg")}</th>
                    <th className="text-right px-3 py-2 font-medium">{t("items.packagingWeightKg")}</th>
                    <th className="text-right px-3 py-2 font-medium">{t("items.totalWeightKg")}</th>
                    <th className="text-left px-3 py-2 font-medium">{t("items.description")}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.items.map((item) => {
                    const packagingKg = item.quantity * item.transportUnitWeightKg;
                    const totalKg = (item.goodsWeightKg ?? 0) + packagingKg;
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{item.transportUnitName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{item.goodsWeightKg != null ? `${item.goodsWeightKg} kg` : "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{packagingKg > 0 ? `${packagingKg} kg` : "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{item.goodsWeightKg != null || packagingKg > 0 ? `${totalKg} kg` : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.description ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {v.items.length > 1 && (() => {
                    const totalGoods = v.items.reduce((s, i) => s + (i.goodsWeightKg ?? 0), 0);
                    const totalPackaging = v.items.reduce((s, i) => s + i.quantity * i.transportUnitWeightKg, 0);
                    const totalAll = totalGoods + totalPackaging;
                    return (
                      <tr className="border-t bg-muted/30 font-medium">
                        <td className="px-3 py-2" colSpan={2}>{t("items.total")}</td>
                        <td className="px-3 py-2 text-right">{totalGoods > 0 ? `${totalGoods} kg` : "—"}</td>
                        <td className="px-3 py-2 text-right">{totalPackaging > 0 ? `${totalPackaging} kg` : "—"}</td>
                        <td className="px-3 py-2 text-right">{totalAll > 0 ? `${totalAll} kg` : "—"}</td>
                        <td />
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Actions ────────────────────────────────────────────────────────────

function StatusActions({
  status,
  hasPending,
  isPending,
  onAction,
  reservationId,
  t,
  tCommon,
}: {
  status: string;
  hasPending: boolean;
  isPending: boolean;
  onAction: (action: () => Promise<{ success: boolean }>, msg: string) => void;
  reservationId: string;
  t: ReturnType<typeof useTranslations<"reservation">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}) {
  const buttons: { label: string; icon: React.ReactNode; action: () => Promise<{ success: boolean }>; variant: "default" | "outline" | "destructive" }[] = [];

  if (status === "REQUESTED" && hasPending) {
    buttons.push({
      label: t("approval.approveNew"),
      icon: <Check className="size-4" />,
      action: () => approveReservation(reservationId),
      variant: "default",
    });
    buttons.push({
      label: t("approval.rejectNew"),
      icon: <X className="size-4" />,
      action: () => rejectReservation(reservationId),
      variant: "destructive",
    });
  }

  if (status === "CONFIRMED") {
    buttons.push({
      label: t("status.UNLOADING_STARTED"),
      icon: <Play className="size-4" />,
      action: () => updateReservationStatus(reservationId, "UNLOADING_STARTED"),
      variant: "default",
    });
    buttons.push({
      label: tCommon("cancel"),
      icon: <Ban className="size-4" />,
      action: () => updateReservationStatus(reservationId, "CANCELLED"),
      variant: "destructive",
    });
  }

  if (status === "UNLOADING_STARTED") {
    buttons.push({
      label: t("status.UNLOADING_COMPLETED"),
      icon: <Square className="size-4" />,
      action: () => updateReservationStatus(reservationId, "UNLOADING_COMPLETED"),
      variant: "default",
    });
  }

  if (status === "UNLOADING_COMPLETED") {
    buttons.push({
      label: t("status.CLOSED"),
      icon: <Lock className="size-4" />,
      action: () => updateReservationStatus(reservationId, "CLOSED"),
      variant: "default",
    });
  }

  if (buttons.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium mb-3">{tCommon("actions")}</p>
        <div className="flex gap-2 flex-wrap">
          {buttons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.variant}
              disabled={isPending}
              className="gap-2"
              onClick={() => onAction(btn.action, btn.label)}
            >
              {btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
