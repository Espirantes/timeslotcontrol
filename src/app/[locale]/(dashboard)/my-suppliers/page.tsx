import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMySuppliers } from "@/lib/actions/client-actions";
import { MySuppliersClient } from "@/components/client/my-suppliers-client";

export default async function MySuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.canManageSuppliers) {
    redirect("/calendar");
  }

  const suppliers = await getMySuppliers();

  return (
    <div className="flex flex-col gap-6">
      <MySuppliersClient suppliers={suppliers} />
    </div>
  );
}
