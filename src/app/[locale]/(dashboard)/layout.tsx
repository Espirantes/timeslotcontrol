import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
          <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
          <Separator orientation="vertical" className="h-4 bg-slate-200" />
          <span className="text-xs text-slate-500 font-medium">TimeSlotControl</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
