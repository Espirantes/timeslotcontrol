import { auth } from "@/auth";
import { getReservationList } from "@/lib/actions/reservations";
import { ReservationsListClient } from "@/components/reservations/reservations-list-client";

export default async function ReservationsPage() {
  const session = await auth();
  if (!session) return null;

  const reservations = await getReservationList();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Rezervace</h1>
      <ReservationsListClient reservations={reservations} role={session.user.role} />
    </div>
  );
}
