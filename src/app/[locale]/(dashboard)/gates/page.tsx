import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGates, getWarehouses } from "@/lib/actions/admin";
import { GatesClient } from "@/components/admin/gates-client";

export default async function GatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [gates, warehouses] = await Promise.all([getGates(), getWarehouses()]);

  return (
    <div className="flex flex-col gap-4">
      <GatesClient items={gates} warehouses={warehouses} />
    </div>
  );
}
