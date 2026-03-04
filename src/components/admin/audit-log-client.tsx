"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, type Locale } from "date-fns";
import { cs } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { it } from "date-fns/locale";

const DATE_LOCALES: Record<string, Locale> = { cs, en: enUS, it };
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs, type AuditLogItem } from "@/lib/actions/admin";

type Props = {
  initialData: { items: AuditLogItem[]; total: number };
};

const PAGE_SIZE = 50;

const actionColors: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  status_changed: "bg-amber-100 text-amber-800",
  version_approved: "bg-green-100 text-green-800",
  version_rejected: "bg-red-100 text-red-800",
  version_proposed: "bg-purple-100 text-purple-800",
  profile_updated: "bg-slate-100 text-slate-800",
  password_changed: "bg-slate-100 text-slate-800",
};

const entityTypes = ["all", "reservation", "gate", "user", "warehouse", "client", "supplier", "transportUnit"];

export function AuditLogClient({ initialData }: Props) {
  const t = useTranslations("auditLog");
  const locale = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? enUS;
  const [items, setItems] = useState(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadPage(newPage: number, entity?: string) {
    const filterEntity = entity ?? entityFilter;
    startTransition(async () => {
      const data = await getAuditLogs({
        take: PAGE_SIZE,
        skip: newPage * PAGE_SIZE,
        entityType: filterEntity === "all" ? undefined : filterEntity,
      });
      setItems(data.items);
      setTotal(data.total);
      setPage(newPage);
    });
  }

  function handleFilterChange(value: string) {
    setEntityFilter(value);
    loadPage(0, value);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ScrollText className="size-6" />
          {t("title")}
        </h1>
        <div className="flex items-center gap-3">
          <Select value={entityFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`entity.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {total} {t("records")}
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left font-medium px-4 py-2.5">{t("colTime")}</th>
              <th className="text-left font-medium px-4 py-2.5">{t("colUser")}</th>
              <th className="text-left font-medium px-4 py-2.5">{t("colEntity")}</th>
              <th className="text-left font-medium px-4 py-2.5">{t("colAction")}</th>
              <th className="text-left font-medium px-4 py-2.5">{t("colDetails")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(item.createdAt), "d.M.yyyy HH:mm:ss", { locale: dateLocale })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs">
                      <span className="font-medium">{item.userName ?? "—"}</span>
                      {item.userEmail && (
                        <span className="text-muted-foreground ml-1">({item.userEmail})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{item.entityType}</span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-32">
                        {item.entityId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="secondary"
                      className={`text-[11px] ${actionColors[item.action] ?? "bg-slate-100 text-slate-800"}`}
                    >
                      {t(`action.${item.action}`, { defaultValue: item.action })}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {(item.oldData != null || item.newData != null) ? (
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {expandedId === item.id ? t("hide") : t("show")}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {expandedId === item.id && (
                      <div className="mt-2 space-y-1">
                        {item.oldData != null && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground">{t("oldData")}:</span>
                            <pre className="text-[11px] bg-red-50 rounded px-2 py-1 overflow-x-auto max-w-md">
                              {JSON.stringify(item.oldData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {item.newData != null && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground">{t("newData")}:</span>
                            <pre className="text-[11px] bg-green-50 rounded px-2 py-1 overflow-x-auto max-w-md">
                              {JSON.stringify(item.newData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("page")} {page + 1} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPage(page - 1)}
              disabled={page === 0 || isPending}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPage(page + 1)}
              disabled={page >= totalPages - 1 || isPending}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
