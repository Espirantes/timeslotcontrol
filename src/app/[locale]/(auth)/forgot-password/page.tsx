import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session) redirect("/calendar");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <ForgotPasswordForm />
    </main>
  );
}
