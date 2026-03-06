"use client"

import { useRouter } from "next/navigation"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Separator,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui"
import { ChevronLeft } from "lucide-react"
import { AppSidebar } from "./AppSidebar"

interface UserData {
  name: string
  email: string
  imageUrl?: string
}

function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <ChevronLeft size={14} strokeWidth={2.5} />
      Volver
    </button>
  )
}

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: UserData
}) {
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join("") || "?"

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          {/* Left */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <BackButton />
          </div>

          {/* Right — user pill */}
          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[13px] font-semibold leading-tight text-foreground">
                {user.name}
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Avatar className="h-7 w-7 border border-border">
              {user.imageUrl && (
                <AvatarImage src={user.imageUrl} alt={user.name} />
              )}
              <AvatarFallback className="text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
