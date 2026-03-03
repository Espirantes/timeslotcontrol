import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HeaderLogo, LanguageSwitcher } from "@/components/layout/app-header";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { notifyBrowser: true },
  });

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="shrink-0">
          <div className="h-1 bg-[#db2b19]" />
          <div className="flex h-13 items-center gap-2 border-b border-[#dae1e5] bg-white px-4">
            <SidebarTrigger className="-ml-1 text-[#2d3e50] hover:text-[#0c1925]" />
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            <HeaderLogo />
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell notifyBrowser={dbUser?.notifyBrowser ?? false} />
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
