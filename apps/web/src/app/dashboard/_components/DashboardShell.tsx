"use client";

import { SidebarProvider, SidebarInset } from "@repo/ui";

import { AppSidebar } from "./AppSidebar";
import { DashbardTopbar } from "@/modules/dashboard/ui/components/dashboard-topbar";

interface UserData {
  name: string;
  email: string;
  imageUrl?: string;
}

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserData;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset className="min-w-0">
        {/* Topbar */}
        <DashbardTopbar user={user} />

        {/* Page content */}
        <div className="flex flex-1 flex-col gap-4 p-4 bg-background min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
