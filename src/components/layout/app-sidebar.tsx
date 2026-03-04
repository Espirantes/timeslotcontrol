"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  ClipboardList,
  Building2,
  DoorOpen,
  Users,
  UserCircle,
  Truck,
  LogOut,
  Settings,
  Package,
  ScrollText,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import type { UserRole } from "@/generated/prisma/client";
import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  user: {
    name: string;
    email: string;
    role: UserRole;
  };
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppSidebar({ user }: Props) {
  const t = useTranslations("nav");
  const tRole = useTranslations("user.role");
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN";

  const mainItems = [
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/reservations", label: t("reservations"), icon: ClipboardList },
  ];

  const adminItems = [
    { href: "/warehouses", label: t("warehouses"), icon: Building2 },
    { href: "/gates", label: t("gates"), icon: DoorOpen },
    { href: "/clients", label: t("clients"), icon: Users },
    { href: "/suppliers", label: t("suppliers"), icon: Truck },
    { href: "/users", label: t("users"), icon: UserCircle },
    { href: "/transport-units", label: t("transportUnits"), icon: Package },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <Image src="/logo-mailstep.svg" alt="Mailstep" width={140} height={28} className="h-7 w-auto" />
        <div className="h-[3px] bg-brand-red rounded-full mt-3" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-brand-muted uppercase tracking-widest mb-1">
            {t("groupWarehouse")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const active = pathname.includes(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon
                          className={`size-[18px] shrink-0 ${active ? "text-brand-red" : "text-brand-muted"}`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[10px] font-medium text-brand-muted uppercase tracking-widest mb-1">
              {t("groupAdmin")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const active = pathname.includes(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon
                            className={`size-[18px] shrink-0 ${active ? "text-brand-red" : "text-brand-muted"}`}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-brand-muted uppercase tracking-widest mb-1">
            {t("groupSystem")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/settings")}>
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings
                      className={`size-[18px] shrink-0 ${pathname.includes("/settings") ? "text-brand-red" : "text-brand-muted"}`}
                    />
                    <span>{t("settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/guide")}>
                  <Link href="/guide" className="flex items-center gap-3">
                    <BookOpen
                      className={`size-[18px] shrink-0 ${pathname.includes("/guide") ? "text-brand-red" : "text-brand-muted"}`}
                    />
                    <span>{t("guide")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/audit-log")}>
                    <Link href="/audit-log" className="flex items-center gap-3">
                      <ScrollText
                        className={`size-[18px] shrink-0 ${pathname.includes("/audit-log") ? "text-brand-red" : "text-brand-muted"}`}
                      />
                      <span>{t("auditLog")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-brand-dark">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2.5 px-3">
                  <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-medium text-xs border border-brand-dark shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="text-xs font-medium text-white truncate">{user.name}</span>
                    <span className="text-[10px] text-brand-muted truncate">{tRole(user.role)}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="size-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
