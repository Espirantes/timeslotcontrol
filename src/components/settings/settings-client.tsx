"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { User, Lock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateProfileName, changePassword, updateNotificationPreferences } from "@/lib/actions/settings";
import type { ProfileData } from "@/lib/actions/settings";

type Props = {
  profile: ProfileData;
};

export function SettingsClient({ profile }: Props) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tRole = useTranslations("user.role");
  const tUserFields = useTranslations("user.fields");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  // ─── Name editing ───────────────────────────────────────────────────────────
  const [name, setName] = useState(profile.name);
  const nameChanged = name.trim() !== profile.name;

  function handleSaveName() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await updateProfileName(name);
        toast.success(t("nameUpdated"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      }
    });
  }

  // ─── Password change ───────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleChangePassword() {
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      try {
        await changePassword(currentPassword, newPassword);
        toast.success(t("passwordChanged"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === "WRONG_PASSWORD") {
            setPasswordError(t("wrongPassword"));
          } else if (err.message === "PASSWORD_TOO_SHORT") {
            setPasswordError(t("passwordTooShort"));
          } else {
            toast.error(err.message);
          }
        }
      }
    });
  }

  const canSubmitPassword = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  // ─── Notification preferences ─────────────────────────────────────────────
  const [notifyInApp, setNotifyInApp] = useState(profile.notifyInApp);
  const [notifyBrowser, setNotifyBrowser] = useState(profile.notifyBrowser);
  const [notifyEmail, setNotifyEmail] = useState(profile.notifyEmail);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  function handleNotificationChange(inApp: boolean, browser: boolean, email: boolean) {
    startTransition(async () => {
      try {
        await updateNotificationPreferences(inApp, browser, email);
        toast.success(t("notificationsSaved"));
      } catch {
        toast.error(tCommon("error"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {/* ─── Profile Card ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            {t("profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{tUserFields("name")}</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-xs"
              />
              {nameChanged && (
                <Button size="sm" onClick={handleSaveName} disabled={isPending}>
                  {tCommon("save")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{tUserFields("email")}</span>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{tUserFields("role")}</span>
              <p className="mt-0.5">
                <Badge variant="outline">{tRole(profile.role)}</Badge>
              </p>
            </div>
            {profile.organizationName && (
              <div>
                <span className="text-muted-foreground">{t("organization")}</span>
                <p className="font-medium">{profile.organizationName}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t("memberSince")}</span>
              <p className="font-medium">
                {format(new Date(profile.createdAt), "d. M. yyyy", { locale: cs })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Password Card ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4" />
            {t("changePassword")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("currentPassword")}</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("newPassword")}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("confirmPassword")}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          <div>
            <Button
              onClick={handleChangePassword}
              disabled={isPending || !canSubmitPassword}
            >
              {isPending ? tCommon("loading") : t("changePassword")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Notifications Card ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" />
            {t("notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-sm">
            <span>{t("notifyEmail")}</span>
            <Switch
              checked={notifyEmail}
              onCheckedChange={(checked) => {
                setNotifyEmail(checked);
                handleNotificationChange(notifyInApp, notifyBrowser, checked);
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t("notifyInApp")}</span>
            <Switch
              checked={notifyInApp}
              onCheckedChange={(checked) => {
                setNotifyInApp(checked);
                handleNotificationChange(checked, notifyBrowser, notifyEmail);
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <div>
              <span>{t("notifyBrowser")}</span>
              {browserPermission === "denied" && (
                <p className="text-xs text-muted-foreground mt-0.5">{t("browserPermission")}</p>
              )}
            </div>
            <Switch
              checked={notifyBrowser}
              onCheckedChange={async (checked) => {
                if (checked && typeof window !== "undefined" && "Notification" in window) {
                  const perm = await Notification.requestPermission();
                  setBrowserPermission(perm);
                  if (perm !== "granted") return;
                }
                setNotifyBrowser(checked);
                handleNotificationChange(notifyInApp, checked, notifyEmail);
              }}
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
