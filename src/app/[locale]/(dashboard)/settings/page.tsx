import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profile = await getProfileData();

  return <SettingsClient profile={profile} />;
}
