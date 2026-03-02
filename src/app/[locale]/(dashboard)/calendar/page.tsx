import { auth } from "@/auth";

export default async function CalendarPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Kalendář</h1>
      <p className="text-muted-foreground">
        Přihlášen jako: {session?.user.name} ({session?.user.role})
      </p>
    </div>
  );
}
