import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTransportUnits } from "@/lib/actions/admin";
import { TransportUnitsClient } from "@/components/admin/transport-units-client";

export default async function TransportUnitsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const raw = await getTransportUnits();
  const items = raw.map((tu) => ({
    ...tu,
    weightKg: Number(tu.weightKg),
  }));

  return (
    <div className="flex flex-col gap-4">
      <TransportUnitsClient items={items} />
    </div>
  );
}
