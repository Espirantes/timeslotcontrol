import { cachedAuth as auth } from "@/auth";
import { getReservationList } from "@/lib/actions/reservations";
import { ReservationsListClient } from "@/components/reservations/reservations-list-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reservations") };
}

export default async function ReservationsPage() {
  const session = await auth();
  if (!session) return null;

  const [reservations, t] = await Promise.all([
    getReservationList(),
    getTranslations("reservation"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{t("title")}</h1>
      <ReservationsListClient
        reservations={reservations}
        role={session.user.role}
      />
    </div>
  );
}
