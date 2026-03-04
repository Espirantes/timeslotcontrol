import { auth } from "@/auth";
import { getWarehouses } from "@/lib/actions/calendar";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const t = await getTranslations("reservation");
  const warehouses = await getWarehouses();

  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("calendar.pageTitle")}</h1>
        <p className="text-muted-foreground">{t("calendar.noWarehouses")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("calendar.pageTitle")}</h1>
      <CalendarPageClient
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        defaultWarehouseId={warehouses[0].id}
        userRole={session.user.role}
      />
    </div>
  );
}
