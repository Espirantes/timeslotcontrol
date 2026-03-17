import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { validateResetToken } from "@/lib/actions/password-reset";
import { cachedAuth as auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token, locale } = await params;

  const session = await auth();
  if (session) redirect("/calendar");

  const { valid } = await validateResetToken(token);
  const t = await getTranslations({ locale, namespace: "auth" });

  if (!valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
        <Card className="w-full max-w-sm overflow-hidden shadow-xl border-0">
          <div className="bg-brand-navy px-6 py-10 flex flex-col items-center gap-4">
            <Image src="/logo-mailstep.svg" alt="Mailstep" width={200} height={48} className="h-12 w-auto" />
            <span className="text-xs font-medium tracking-widest uppercase text-brand-muted">{t("appName")}</span>
          </div>
          <div className="h-1 bg-brand-red" />
          <CardHeader>
            <CardTitle className="text-brand-navy">{t("resetExpiredTitle")}</CardTitle>
            <CardDescription>{t("resetExpiredBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password" className="text-sm text-brand-red hover:underline font-medium">
              {t("resetRequestNew")}
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <ResetPasswordForm token={token} />
    </main>
  );
}
