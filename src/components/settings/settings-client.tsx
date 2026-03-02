"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/generated/prisma/client";

const LOCALE_OPTIONS = ["cs", "en", "it"] as const;

type Props = {
  user: {
    name: string;
    email: string;
    role: UserRole;
    warehouseId?: string | null;
    clientId?: string | null;
    supplierId?: string | null;
  };
};

export function SettingsClient({ user }: Props) {
  const t = useTranslations("settings");
  const tRole = useTranslations("user.role");
  const tUserFields = useTranslations("user.fields");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Replace current locale segment in pathname
    const segments = pathname.split("/");
    // segments[0] is empty, segments[1] is locale
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{tUserFields("name")}</span>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tUserFields("email")}</span>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tUserFields("role")}</span>
              <p>
                <Badge variant="outline">{tRole(user.role)}</Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("languageDescription")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {LOCALE_OPTIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  locale === loc
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                {t(`languages.${loc}`)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
