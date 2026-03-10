import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GatesClient } from "@/components/admin/gates-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("gates") };
}

export default async function GatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [gates, warehouses] = await Promise.all([
    prisma.gates.findMany({
      select: {
        id: true,
        warehouseId: true,
        name: true,
        description: true,
        isActive: true,
        sortOrder: true,
        warehouse: { select: { id: true, name: true } },
        openingHours: { orderBy: { dayOfWeek: "asc" } },
      },
      orderBy: [{ warehouse: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <GatesClient items={gates} warehouses={warehouses} />
    </div>
  );
}
