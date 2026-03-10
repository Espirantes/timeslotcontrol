"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export function PendingApprovalBanner() {
  const t = useTranslations("auth");

  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
      <AlertTriangle className="size-4 shrink-0" />
      <span>{t("pendingApproval")}</span>
    </div>
  );
}
