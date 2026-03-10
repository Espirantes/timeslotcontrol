import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientsClient } from "@/components/admin/clients-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("clients") };
}

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const clients = await prisma.client.findMany({
    include: {
      suppliers: { include: { supplier: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <ClientsClient items={clients} />
    </div>
  );
}
