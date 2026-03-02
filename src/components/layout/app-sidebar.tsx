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

export function AppSidebar({ user }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN";
  const isWorker = user.role === "WAREHOUSE_WORKER";

  const mainItems = [
    { href: "/dashboard/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/dashboard/reservations", label: t("reservations"), icon: ClipboardList },
  ];

  const adminItems = [
    { href: "/dashboard/warehouses", label: t("warehouses"), icon: Building2 },
    { href: "/dashboard/gates", label: t("gates"), icon: DoorOpen },
    { href: "/dashboard/clients", label: t("clients"), icon: Users },
    { href: "/dashboard/suppliers", label: t("suppliers"), icon: Truck },
    { href: "/dashboard/users", label: t("users"), icon: UserCircle },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <span className="font-semibold text-lg">TimeSlotControl</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.includes(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isWorker) && (
          <SidebarGroup>
            <SidebarGroupLabel>Správa</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.includes(item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <UserCircle />
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
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
