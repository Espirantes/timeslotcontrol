import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TransportUnitsClient } from "@/components/admin/transport-units-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("transportUnits") };
}

export default async function TransportUnitsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const raw = await prisma.transportUnit.findMany({
    select: {
      id: true,
      name: true,
      weightKg: true,
      processingMinutes: true,
      isActive: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
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
