import { LoginForm } from "@/components/auth/login-form";
import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/calendar");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <LoginForm />
    </main>
  );
}
