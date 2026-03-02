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

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrator",
  WAREHOUSE_WORKER: "Warehouse Worker",
  CLIENT: "Client",
  SUPPLIER: "Carrier",
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
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN";
  const isWorker = user.role === "WAREHOUSE_WORKER";

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
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold text-[10px] tracking-tighter shrink-0">
            TS
          </div>
          <span className="font-semibold tracking-tight text-slate-900">TimeSlotControl</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">
            Warehouse
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
                          className={`size-[18px] shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`}
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

        {(isAdmin || isWorker) && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">
              Správa
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
                            className={`size-[18px] shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`}
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
          <SidebarGroupLabel className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/settings")}>
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings className="size-[18px] shrink-0 text-slate-400" />
                    <span>Nastavení</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2.5 px-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-xs border border-indigo-200 shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="text-xs font-medium text-slate-900 truncate">{user.name}</span>
                    <span className="text-[10px] text-slate-500 truncate">{ROLE_LABEL[user.role]}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="size-4" />
                  Odhlásit se
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
