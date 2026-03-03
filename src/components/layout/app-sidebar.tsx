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
import type { UserRole } from "@/generated/prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
        <img src="/logo-mailstep.svg" alt="Mailstep" className="h-7" />
        <div className="h-[3px] bg-[#db2b19] rounded-full mt-3" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-[#5a7a8f] uppercase tracking-widest mb-1">
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
                          className={`size-[18px] shrink-0 ${active ? "text-[#db2b19]" : "text-[#5a7a8f]"}`}
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
            <SidebarGroupLabel className="px-3 text-[10px] font-medium text-[#5a7a8f] uppercase tracking-widest mb-1">
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
                            className={`size-[18px] shrink-0 ${active ? "text-[#db2b19]" : "text-[#5a7a8f]"}`}
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
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-[#5a7a8f] uppercase tracking-widest mb-1">
            {t("groupSystem")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/settings")}>
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings
                      className={`size-[18px] shrink-0 ${pathname.includes("/settings") ? "text-[#db2b19]" : "text-[#5a7a8f]"}`}
                    />
                    <span>{t("settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/guide")}>
                  <Link href="/guide" className="flex items-center gap-3">
                    <BookOpen
                      className={`size-[18px] shrink-0 ${pathname.includes("/guide") ? "text-[#db2b19]" : "text-[#5a7a8f]"}`}
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
                        className={`size-[18px] shrink-0 ${pathname.includes("/audit-log") ? "text-[#db2b19]" : "text-[#5a7a8f]"}`}
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

      <SidebarFooter className="border-t border-[#1f3947]">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2.5 px-3">
                  <div className="w-8 h-8 rounded-full bg-[#1f3947] text-white flex items-center justify-center font-medium text-xs border border-[#2d4e5f] shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="text-xs font-medium text-white truncate">{user.name}</span>
                    <span className="text-[10px] text-[#5a7a8f] truncate">{tRole(user.role)}</span>
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
