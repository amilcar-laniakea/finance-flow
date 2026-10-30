"use client";

import { SidebarProvider, SidebarInset } from "@repo/ui";
import { AppSidebar } from "./AppSidebar";
import { DashbardTopbar } from "@/modules/dashboard/ui/components/dashboard-topbar";
import type { SerializedInstanceContext } from "@/lib/getInstanceContext";

interface UserData {
  name: string;
  email: string;
  imageUrl?: string;
}

export function DashboardShell({
  children,
  user,
  instanceCtx,
}: {
  children: React.ReactNode;
  user: UserData;
  instanceCtx: SerializedInstanceContext;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} instanceCtx={instanceCtx} />

      <SidebarInset className="min-w-0">
        <DashbardTopbar user={user} />
        <div className="flex flex-1 flex-col gap-4 p-4 bg-background min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
