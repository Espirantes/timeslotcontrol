"use client";

import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ClipboardList,
  Settings,
  Building2,
  DoorOpen,
  Users,
  Truck,
  Package,
  ScrollText,
  UserCircle,
  Shield,
  Lightbulb,
  ArrowRight,
  UserPlus,
  Handshake,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/generated/prisma/client";

type Props = {
  role: UserRole;
};

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md bg-blue-50 border border-border p-3 mt-3 text-sm text-brand-navy">
      <Lightbulb className="size-4 shrink-0 text-brand-red mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function RoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {roles.map((role) => (
        <Badge
          key={role}
          variant="outline"
          className="text-[10px] font-medium border-border text-brand-muted"
        >
          {role}
        </Badge>
      ))}
    </div>
  );
}

function StatusFlow({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2 text-sm">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="rounded bg-blue-50 border border-border px-2 py-0.5 text-xs font-medium text-brand-navy">
            {step}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight className="size-3 text-brand-muted" />
          )}
        </span>
      ))}
    </div>
  );
}

const ROLE_KEY_MAP: Record<UserRole, string> = {
  ADMIN: "admin",
  WAREHOUSE_WORKER: "worker",
  CLIENT: "client",
  SUPPLIER: "supplier",
};

const INTRO_ROLES: { key: string; roleEnum: UserRole }[] = [
  { key: "Admin", roleEnum: "ADMIN" },
  { key: "Worker", roleEnum: "WAREHOUSE_WORKER" },
  { key: "Client", roleEnum: "CLIENT" },
  { key: "Supplier", roleEnum: "SUPPLIER" },
];

export function GuideClient({ role }: Props) {
  const t = useTranslations("guide");
  const isAdmin = role === "ADMIN";
  const isClient = role === "CLIENT";
  const isWorkerOrAdmin = role === "ADMIN" || role === "WAREHOUSE_WORKER";
  const canCreate = role === "ADMIN" || role === "SUPPLIER";

  // Role-specific tip key for calendar
  function calendarTip() {
    if (role === "WAREHOUSE_WORKER") return t("calendar.tipWorker");
    if (role === "SUPPLIER") return t("calendar.tipSupplier");
    if (role === "CLIENT") return t("calendar.tipClient");
    return t("calendar.tip");
  }

  // Role-specific description and tip for reservations
  function reservationDesc() {
    if (role === "WAREHOUSE_WORKER") return t("reservations.descWorker");
    if (role === "SUPPLIER") return t("reservations.descSupplier");
    if (role === "CLIENT") return t("reservations.descClient");
    return t("reservations.desc");
  }

  function reservationTip() {
    if (role === "WAREHOUSE_WORKER") return t("reservations.tipWorker");
    if (role === "SUPPLIER") return t("reservations.tipSupplier");
    if (role === "CLIENT") return t("reservations.tipClient");
    return t("reservations.tip");
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-brand-muted mt-1">{t("subtitle")}</p>
      </div>

      {/* Intro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-[18px] text-brand-red" />
            {t("intro.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-brand-navy space-y-2">
          <p>{t("intro.desc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {INTRO_ROLES.map(({ key, roleEnum }) => {
              const isActive = roleEnum === role;
              return (
                <div
                  key={key}
                  className={`rounded-md border p-2.5 transition-colors ${
                    isActive
                      ? "border-brand-red bg-red-50"
                      : "border-border opacity-60"
                  }`}
                >
                  <span className="font-medium">
                    {t(`intro.role${key}`)}
                    {isActive && (
                      <Badge variant="outline" className="ml-2 text-[10px] border-brand-red text-brand-red">
                        {t(`roles.${ROLE_KEY_MAP[role]}`)}
                      </Badge>
                    )}
                  </span>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {t(`intro.role${key}Desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="size-[18px] text-brand-red" />
            {t("registration.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-brand-navy space-y-2">
          <p>{t("registration.desc")}</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-muted">
            <li>{t("registration.point1")}</li>
            <li>{t("registration.point2")}</li>
            <li>{t("registration.point3")}</li>
          </ol>
          <Tip>{t("registration.tip")}</Tip>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-[18px] text-brand-red" />
            {t("calendar.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-brand-navy space-y-2">
          <p>{t("calendar.desc")}</p>
          <ul className="list-disc list-inside space-y-1 text-brand-muted">
            <li>{t("calendar.point1")}</li>
            <li>{t("calendar.point2")}</li>
            <li>{t("calendar.point3")}</li>
          </ul>
          <Tip>{calendarTip()}</Tip>
        </CardContent>
      </Card>

      {/* Reservations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="size-[18px] text-brand-red" />
            {t("reservations.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-brand-navy space-y-3">
          <p>{reservationDesc()}</p>

          {canCreate && (
            <div>
              <p className="font-medium mb-1">{t("reservations.createTitle")}</p>
              <ol className="list-decimal list-inside space-y-1 text-brand-muted">
                <li>{t("reservations.step1")}</li>
                <li>{t("reservations.step2")}</li>
                <li>{t("reservations.step3")}</li>
                <li>{t("reservations.step4")}</li>
              </ol>
            </div>
          )}

          <div>
            <p className="font-medium mb-1">{t("reservations.statusTitle")}</p>
            {isWorkerOrAdmin ? (
              <StatusFlow
                steps={[
                  t("reservations.statusRequested"),
                  t("reservations.statusConfirmed"),
                  t("reservations.statusUnloading"),
                  t("reservations.statusCompleted"),
                  t("reservations.statusClosed"),
                ]}
              />
            ) : (
              <StatusFlow
                steps={[
                  t("reservations.statusRequested"),
                  t("reservations.statusConfirmed"),
                  t("reservations.statusClosed"),
                ]}
              />
            )}
          </div>

          <Tip>{reservationTip()}</Tip>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-[18px] text-brand-red" />
            {t("settings.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-brand-navy space-y-2">
          <p>{t("settings.desc")}</p>
          <ul className="list-disc list-inside space-y-1 text-brand-muted">
            <li>{t("settings.point1")}</li>
            <li>{t("settings.point2")}</li>
            <li>{t("settings.point3")}</li>
          </ul>
          <Tip>{t("settings.tip")}</Tip>
        </CardContent>
      </Card>

      {/* Client sections */}
      {isClient && (
        <>
          <h2 className="text-lg font-semibold mt-2">{t("client.heading")}</h2>

          {/* My Suppliers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="size-[18px] text-brand-red" />
                {t("client.mySuppliers.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.client")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("client.mySuppliers.desc")}</p>
              <ul className="list-disc list-inside space-y-1 text-brand-muted">
                <li>{t("client.mySuppliers.point1")}</li>
                <li>{t("client.mySuppliers.point2")}</li>
                <li>{t("client.mySuppliers.point3")}</li>
              </ul>
              <Tip>{t("client.mySuppliers.tip")}</Tip>
            </CardContent>
          </Card>
        </>
      )}

      {/* Admin sections */}
      {isAdmin && (
        <>
          <h2 className="text-lg font-semibold mt-2">{t("admin.heading")}</h2>

          {/* Warehouses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-[18px] text-brand-red" />
                {t("admin.warehouses.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.warehouses.desc")}</p>
              <Tip>{t("admin.warehouses.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Gates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DoorOpen className="size-[18px] text-brand-red" />
                {t("admin.gates.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.gates.desc")}</p>
              <Tip>{t("admin.gates.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Clients & Suppliers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-[18px] text-brand-red" />
                {t("admin.clientsSuppliers.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.clientsSuppliers.desc")}</p>
              <Tip>{t("admin.clientsSuppliers.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="size-[18px] text-brand-red" />
                {t("admin.users.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.users.desc")}</p>
              <Tip>{t("admin.users.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Transport Units */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-[18px] text-brand-red" />
                {t("admin.transportUnits.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.transportUnits.desc")}</p>
              <Tip>{t("admin.transportUnits.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="size-[18px] text-brand-red" />
                {t("admin.auditLog.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-brand-navy space-y-2">
              <p>{t("admin.auditLog.desc")}</p>
              <Tip>{t("admin.auditLog.tip")}</Tip>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
