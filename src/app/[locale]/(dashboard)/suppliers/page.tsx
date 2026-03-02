import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSuppliers, getClients } from "@/lib/actions/admin";
import { SuppliersClient } from "@/components/admin/suppliers-client";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [suppliers, clients] = await Promise.all([getSuppliers(), getClients()]);

  return (
    <div className="flex flex-col gap-4">
      <SuppliersClient items={suppliers} clients={clients} />
    </div>
  );
}
