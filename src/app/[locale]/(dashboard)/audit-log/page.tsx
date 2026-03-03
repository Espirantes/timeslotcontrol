import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/actions/admin";
import { AuditLogClient } from "@/components/admin/audit-log-client";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const data = await getAuditLogs({ take: 50 });

  return (
    <div className="flex flex-col gap-4">
      <AuditLogClient initialData={data} />
    </div>
  );
}
