import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/calendar");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f5] p-4">
      <LoginForm />
    </main>
  );
}
