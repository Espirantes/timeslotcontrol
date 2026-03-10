import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRecurringReservations } from "@/lib/actions/recurring-reservations";
import { getWarehouses } from "@/lib/actions/calendar";
import { RecurringListClient } from "@/components/recurring/recurring-list-client";

export default async function RecurringReservationsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "WAREHOUSE_WORKER") {
    redirect("/calendar");
  }

  const [items, warehouses] = await Promise.all([
    getRecurringReservations(
      session.user.role === "WAREHOUSE_WORKER" ? session.user.warehouseIds?.[0] : undefined
    ),
    getWarehouses(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <RecurringListClient
        items={items}
        warehouses={warehouses}
      />
    </div>
  );
}
