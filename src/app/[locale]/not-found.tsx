import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-brand-bg">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground">{t("notFound")}</p>
      <Button asChild>
        <Link href="/calendar">{t("backToHome")}</Link>
      </Button>
    </div>
  );
}
