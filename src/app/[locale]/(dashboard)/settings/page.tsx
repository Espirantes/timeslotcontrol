import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <SettingsClient user={session.user} />;
}
