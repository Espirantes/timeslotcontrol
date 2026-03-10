import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HeaderLogo, LanguageSwitcher } from "@/components/layout/app-header";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PendingApprovalBanner } from "@/components/layout/pending-approval-banner";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [dbUser, pendingUsersCount] = await Promise.all([
    session.user.email
      ? prisma.user.findUnique({
          where: { email: session.user.email },
          select: { notifyBrowser: true },
        })
      : null,
    session.user.role === "ADMIN"
      ? prisma.user.count({ where: { isVerified: false, isActive: true } })
      : 0,
  ]);

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} pendingUsersCount={pendingUsersCount} />
      <SidebarInset>
        <header className="shrink-0">
          <div className="h-1 bg-brand-red" />
          <div className="flex h-13 items-center gap-2 border-b border-border bg-white px-4">
            <SidebarTrigger className="-ml-1 text-foreground hover:text-brand-navy" />
            <Separator orientation="vertical" className="h-4 bg-slate-200" />
            <HeaderLogo />
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell notifyBrowser={dbUser?.notifyBrowser ?? false} />
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        {!session.user.isVerified && <PendingApprovalBanner />}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
