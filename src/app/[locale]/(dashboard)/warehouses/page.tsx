import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWarehouses } from "@/lib/actions/admin";
import { WarehousesClient } from "@/components/admin/warehouses-client";

export default async function WarehousesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const warehouses = await getWarehouses();

  return (
    <div className="flex flex-col gap-4">
      <WarehousesClient items={warehouses} />
    </div>
  );
}
