import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { GuideClient } from "@/components/guide/guide-client";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("guide") };
}

export default async function GuidePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <GuideClient role={session.user.role} />;
}
