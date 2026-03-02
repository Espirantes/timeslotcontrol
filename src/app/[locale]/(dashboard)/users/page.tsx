import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUsers, getWarehouses, getClients, getSuppliers } from "@/lib/actions/admin";
import { UsersClient } from "@/components/admin/users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [users, warehouses, clients, suppliers] = await Promise.all([
    getUsers(),
    getWarehouses(),
    getClients(),
    getSuppliers(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <UsersClient items={users} warehouses={warehouses} clients={clients} suppliers={suppliers} />
    </div>
  );
}
