import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WarehousesClient } from "@/components/admin/warehouses-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("warehouses") };
}

export default async function WarehousesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const warehouses = await prisma.warehouse.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      timezone: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <WarehousesClient items={warehouses} />
    </div>
  );
}
