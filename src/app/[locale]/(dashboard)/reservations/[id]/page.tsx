import { cachedAuth as auth } from "@/auth";
import { getReservationDetail } from "@/lib/actions/reservations";
import { ReservationDetailClient } from "@/components/reservations/reservation-detail-client";
import { redirect, notFound } from "next/navigation";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const reservation = await getReservationDetail(id);
  if (!reservation) notFound();

  return <ReservationDetailClient reservation={reservation} role={session.user.role} />;
}
