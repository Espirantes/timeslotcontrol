import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GuideClient } from "@/components/guide/guide-client";

export default async function GuidePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <GuideClient role={session.user.role} />;
}
