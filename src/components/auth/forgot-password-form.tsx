"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    startTransition(async () => {
      await requestPasswordReset(email);
      setSubmitted(true);
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
        <CardTitle className="text-brand-navy">{t("forgotTitle")}</CardTitle>
        <CardDescription>{t("forgotSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("forgotSent")}</p>
            <Link href="/login" className="text-sm text-brand-red hover:underline font-medium text-center">
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : t("forgotButton")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-brand-red hover:underline font-medium">
                {t("backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
