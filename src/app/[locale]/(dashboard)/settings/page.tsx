import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profile = await getProfileData();

  return <SettingsClient profile={profile} />;
}
