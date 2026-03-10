"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Link } from "@/i18n/navigation";
import { registerSupplier } from "@/lib/actions/auth-actions";
import { CheckCircle2 } from "lucide-react";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      await registerSupplier({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password,
        message: (form.get("message") as string) || undefined,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_EXISTS") {
        setError(t("emailExists"));
      } else {
        setError(t("registerError"));
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-sm overflow-hidden shadow-xl border-0">
        <div className="bg-brand-navy px-6 py-10 flex flex-col items-center gap-4">
          <Image src="/logo-mailstep.svg" alt="Mailstep" width={200} height={48} className="h-12 w-auto" />
          <span className="text-xs font-medium tracking-widest uppercase text-brand-muted">{t("appName")}</span>
        </div>
        <div className="h-1 bg-brand-red" />
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="size-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-navy mb-2">{t("registerSuccessTitle")}</h3>
          <p className="text-sm text-brand-muted mb-6">{t("registerSuccessMessage")}</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">{t("backToLogin")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-xl border-0">
      <div className="bg-brand-navy px-6 py-10 flex flex-col items-center gap-4">
        <Image src="/logo-mailstep.svg" alt="Mailstep" width={200} height={48} className="h-12 w-auto" />
        <span className="text-xs font-medium tracking-widest uppercase text-brand-muted">{t("appName")}</span>
      </div>
      <div className="h-1 bg-brand-red" />
      <CardHeader>
        <CardTitle className="text-brand-navy">{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">{t("registerMessage")}</Label>
            <textarea
              id="message"
              name="message"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t("registerMessagePlaceholder")}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : t("registerButton")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-brand-red hover:underline font-medium">
              {t("loginButton")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
