import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "@/components/admin/suppliers-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("suppliers") };
}

export default async function SuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [suppliers, clients] = await Promise.all([
    prisma.supplier.findMany({
      include: {
        clients: { include: { client: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      include: {
        suppliers: { include: { supplier: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SuppliersClient items={suppliers} clients={clients} />
    </div>
  );
}
