import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "@/components/admin/users-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("users") };
}

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/calendar");

  const [users, warehouses, clients, suppliers] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isVerified: true,
        registrationMessage: true,
        clientId: true,
        supplierId: true,
        createdAt: true,
        warehouses: { include: { warehouse: true } },
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      include: {
        suppliers: { include: { supplier: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      include: {
        clients: { include: { client: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <UsersClient
        items={users}
        warehouses={warehouses}
        clients={clients}
        suppliers={suppliers}
      />
    </div>
  );
}
