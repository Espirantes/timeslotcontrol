"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { resetPassword } from "@/lib/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(token, password);
      if (!result.ok) {
        setError(result.error ?? t("resetError"));
      } else {
        setDone(true);
      }
    });
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-xl border-0">
      <div className="bg-brand-navy px-6 py-10 flex flex-col items-center gap-4">
        <Image src="/logo-mailstep.svg" alt="Mailstep" width={200} height={48} className="h-12 w-auto" />
        <span className="text-xs font-medium tracking-widest uppercase text-brand-muted">{t("appName")}</span>
      </div>
      <div className="h-1 bg-brand-red" />
      <CardHeader>
        <CardTitle className="text-brand-navy">{t("resetTitle")}</CardTitle>
        <CardDescription>{t("resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("resetSuccess")}</p>
            <Link href="/login" className="text-sm text-brand-red hover:underline font-medium text-center">
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                autoFocus
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : t("resetButton")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
