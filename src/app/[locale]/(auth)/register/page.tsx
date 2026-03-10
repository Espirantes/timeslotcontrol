import { RegisterForm } from "@/components/auth/register-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/calendar");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <RegisterForm />
    </main>
  );
}
