import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CarriersClient } from "@/components/admin/carriers-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("carriers") };
}

export default async function CarriersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [carriers, suppliers] = await Promise.all([
    prisma.carrier.findMany({
      where: { deletedAt: null },
      include: {
        suppliers: { include: { supplier: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <CarriersClient items={carriers} suppliers={suppliers} />
    </div>
  );
}
