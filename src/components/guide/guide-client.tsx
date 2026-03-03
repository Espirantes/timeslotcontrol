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
    <div className="flex gap-2 rounded-md bg-[#eef5f9] border border-[#dae1e5] p-3 mt-3 text-sm text-[#2d3e50]">
      <Lightbulb className="size-4 shrink-0 text-[#db2b19] mt-0.5" />
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
          className="text-[10px] font-medium border-[#dae1e5] text-[#5a7a8f]"
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
          <span className="rounded bg-[#eef5f9] border border-[#dae1e5] px-2 py-0.5 text-xs font-medium text-[#2d3e50]">
            {step}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight className="size-3 text-[#5a7a8f]" />
          )}
        </span>
      ))}
    </div>
  );
}

export function GuideClient({ role }: Props) {
  const t = useTranslations("guide");
  const isAdmin = role === "ADMIN";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-[#5a7a8f] mt-1">{t("subtitle")}</p>
      </div>

      {/* Intro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-[18px] text-[#db2b19]" />
            {t("intro.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#2d3e50] space-y-2">
          <p>{t("intro.desc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded-md border border-[#dae1e5] p-2.5">
              <span className="font-medium">{t("intro.roleAdmin")}</span>
              <p className="text-xs text-[#5a7a8f] mt-0.5">{t("intro.roleAdminDesc")}</p>
            </div>
            <div className="rounded-md border border-[#dae1e5] p-2.5">
              <span className="font-medium">{t("intro.roleWorker")}</span>
              <p className="text-xs text-[#5a7a8f] mt-0.5">{t("intro.roleWorkerDesc")}</p>
            </div>
            <div className="rounded-md border border-[#dae1e5] p-2.5">
              <span className="font-medium">{t("intro.roleClient")}</span>
              <p className="text-xs text-[#5a7a8f] mt-0.5">{t("intro.roleClientDesc")}</p>
            </div>
            <div className="rounded-md border border-[#dae1e5] p-2.5">
              <span className="font-medium">{t("intro.roleSupplier")}</span>
              <p className="text-xs text-[#5a7a8f] mt-0.5">{t("intro.roleSupplierDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-[18px] text-[#db2b19]" />
            {t("calendar.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-[#2d3e50] space-y-2">
          <p>{t("calendar.desc")}</p>
          <ul className="list-disc list-inside space-y-1 text-[#5a7a8f]">
            <li>{t("calendar.point1")}</li>
            <li>{t("calendar.point2")}</li>
            <li>{t("calendar.point3")}</li>
          </ul>
          <Tip>{t("calendar.tip")}</Tip>
        </CardContent>
      </Card>

      {/* Reservations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="size-[18px] text-[#db2b19]" />
            {t("reservations.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-[#2d3e50] space-y-3">
          <p>{t("reservations.desc")}</p>

          <div>
            <p className="font-medium mb-1">{t("reservations.createTitle")}</p>
            <ol className="list-decimal list-inside space-y-1 text-[#5a7a8f]">
              <li>{t("reservations.step1")}</li>
              <li>{t("reservations.step2")}</li>
              <li>{t("reservations.step3")}</li>
              <li>{t("reservations.step4")}</li>
            </ol>
          </div>

          <div>
            <p className="font-medium mb-1">{t("reservations.statusTitle")}</p>
            <StatusFlow
              steps={[
                t("reservations.statusRequested"),
                t("reservations.statusConfirmed"),
                t("reservations.statusUnloading"),
                t("reservations.statusCompleted"),
                t("reservations.statusClosed"),
              ]}
            />
          </div>

          <Tip>{t("reservations.tip")}</Tip>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-[18px] text-[#db2b19]" />
            {t("settings.title")}
          </CardTitle>
          <RoleBadges roles={[t("roles.all")]} />
        </CardHeader>
        <CardContent className="text-sm text-[#2d3e50] space-y-2">
          <p>{t("settings.desc")}</p>
          <ul className="list-disc list-inside space-y-1 text-[#5a7a8f]">
            <li>{t("settings.point1")}</li>
            <li>{t("settings.point2")}</li>
            <li>{t("settings.point3")}</li>
          </ul>
          <Tip>{t("settings.tip")}</Tip>
        </CardContent>
      </Card>

      {/* Admin sections */}
      {isAdmin && (
        <>
          <h2 className="text-lg font-semibold mt-2">{t("admin.heading")}</h2>

          {/* Warehouses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-[18px] text-[#db2b19]" />
                {t("admin.warehouses.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.warehouses.desc")}</p>
              <Tip>{t("admin.warehouses.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Gates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DoorOpen className="size-[18px] text-[#db2b19]" />
                {t("admin.gates.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.gates.desc")}</p>
              <Tip>{t("admin.gates.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Clients & Suppliers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-[18px] text-[#db2b19]" />
                {t("admin.clientsSuppliers.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.clientsSuppliers.desc")}</p>
              <Tip>{t("admin.clientsSuppliers.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="size-[18px] text-[#db2b19]" />
                {t("admin.users.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.users.desc")}</p>
              <Tip>{t("admin.users.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Transport Units */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-[18px] text-[#db2b19]" />
                {t("admin.transportUnits.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.transportUnits.desc")}</p>
              <Tip>{t("admin.transportUnits.tip")}</Tip>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="size-[18px] text-[#db2b19]" />
                {t("admin.auditLog.title")}
              </CardTitle>
              <RoleBadges roles={[t("roles.admin")]} />
            </CardHeader>
            <CardContent className="text-sm text-[#2d3e50] space-y-2">
              <p>{t("admin.auditLog.desc")}</p>
              <Tip>{t("admin.auditLog.tip")}</Tip>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
