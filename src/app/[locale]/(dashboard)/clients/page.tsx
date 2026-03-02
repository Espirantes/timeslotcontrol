import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getClients } from "@/lib/actions/admin";
import { ClientsClient } from "@/components/admin/clients-client";

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const clients = await getClients();

  return (
    <div className="flex flex-col gap-4">
      <ClientsClient items={clients} />
    </div>
  );
}
