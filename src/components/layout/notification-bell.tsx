"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck, Plus, ShieldCheck, ShieldX, ArrowRightLeft, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
} from "@/lib/actions/notifications";

const POLL_INTERVAL = 30_000; // 30 seconds

const typeIcons: Record<string, typeof Bell> = {
  RESERVATION_CREATED: Plus,
  RESERVATION_APPROVED: ShieldCheck,
  RESERVATION_REJECTED: ShieldX,
  STATUS_CHANGED: ArrowRightLeft,
  CHANGE_REQUESTED: Pencil,
};

const typeColors: Record<string, string> = {
  RESERVATION_CREATED: "text-blue-500",
  RESERVATION_APPROVED: "text-green-600",
  RESERVATION_REJECTED: "text-red-500",
  STATUS_CHANGED: "text-amber-500",
  CHANGE_REQUESTED: "text-purple-500",
};

export function NotificationBell({ notifyBrowser }: { notifyBrowser: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("notifications");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevCountRef = useRef(0);

  // Poll unread count
  const fetchCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      // Browser notification when count increases
      if (notifyBrowser && count > prevCountRef.current && prevCountRef.current >= 0) {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Dock Scheduling System", {
            body: t("newNotification"),
            icon: "/logo-mailstep.svg",
          });
        }
      }
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, [notifyBrowser, t]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Load notifications when popover opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      try {
        const items = await getNotifications();
        setNotifications(items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
  };

  // Click on a notification
  const handleClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (notif.reservationId) {
      router.push(`/${locale}/reservations/${notif.reservationId}`);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-[#2d3e50] hover:text-[#0c1925]">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-[#db2b19] text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              {t("markAllRead")}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</div>
          ) : (
            notifications.map((notif) => {
              const Icon = typeIcons[notif.type] ?? Bell;
              const iconColor = typeColors[notif.type] ?? "text-muted-foreground";

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    !notif.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {t(notif.type as "RESERVATION_CREATED")}
                      </span>
                      {!notif.isRead && (
                        <span className="size-1.5 rounded-full bg-[#db2b19]" />
                      )}
                    </div>
                    {notif.title && (
                      <p className="text-xs text-muted-foreground truncate">{notif.title}</p>
                    )}
                    {notif.message && (
                      <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: locale === "cs" ? cs : undefined,
                      })}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
