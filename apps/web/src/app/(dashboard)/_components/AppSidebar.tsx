"use client"

import { useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  Separator,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  useSidebar,
} from "@repo/ui"
import {
  Home,
  Receipt,
  TrendingUp,
  Landmark,
  PieChart,
  ArrowLeftRight,
  Globe,
  Tag,
  Users,
  LogOut,
  ChevronsUpDown,
  Building2,
  Check,
  ShieldCheck,
  Scale,
} from "lucide-react"
import { setActiveInstance } from "@/lib/actions/setActiveInstance"
import type { SerializedInstanceContext } from "@/lib/getInstanceContext"

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  exact?: boolean
  description?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

function buildNavGroups(role: string, isMain: boolean): NavGroup[] {
  const isAdminPlus = role === "admin" || role === "superadmin"

  return [
    {
      label: "PRINCIPAL",
      items: [
        { href: "/", icon: Home, label: "Inicio", exact: true, description: "Resumen general" },
        { href: "/members", icon: Users, label: "Usuarios", description: "Miembros y roles" },
      ],
    },
    {
      label: "GASTOS",
      items: [
        { href: "/expenses", icon: Receipt, label: "Gastos", description: "Registro de gastos" },
        { href: "/types", icon: Tag, label: "Tipos de Gasto", description: "Categorías de gastos" },
      ],
    },
    {
      label: "INGRESOS",
      items: [
        { href: "/incomes", icon: TrendingUp, label: "Ingresos", description: "Entradas de dinero" },
        { href: "/allocations", icon: PieChart, label: "Asignaciones", description: "Distribución de ingresos" },
      ],
    },
    {
      label: "TRANSFERENCIAS",
      items: [
        { href: "/transfers", icon: ArrowLeftRight, label: "Locales", description: "Entre fondos y miembros" },
        ...(isAdminPlus
          ? [{ href: "/instance-transfers", icon: Globe, label: "Globales", description: "Entre instancias" }]
          : []),
      ],
    },
    {
      label: "OTROS",
      items: [
        { href: "/funds", icon: Landmark, label: "Fondos", description: "Fuentes de ingreso" },
        ...(role === "superadmin"
          ? [{ href: "/admin", icon: ShieldCheck, label: "Administración", description: "Panel de superadmin" }]
          : []),
      ],
    },
    ...(isAdminPlus && isMain
      ? [{
          label: "AUDITORÍA",
          items: [
            { href: "/audit", icon: Scale, label: "Saldo Binance", description: "Verificación vs Binance" },
          ],
        }]
      : []),
  ]
}

interface AppSidebarProps {
  user: { name: string; email: string; imageUrl?: string }
  instanceCtx: SerializedInstanceContext
}

export function AppSidebar({ user, instanceCtx }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, open, setOpenMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  function handleNavClick() {
    if (isMobile) setOpenMobile(false)
  }

  function handleSwitchInstance(id: string) {
    if (isMobile) setOpenMobile(false)
    startTransition(async () => {
      await setActiveInstance(id)
      router.refresh()
    })
  }

  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0]!.toUpperCase())
      .slice(0, 2)
      .join("") || "?"

  const navGroups = buildNavGroups(instanceCtx.role, instanceCtx.isMainInstance)
  const hasMultipleInstances = instanceCtx.availableInstances.length > 1
  const instanceLabel = instanceCtx.isMainInstance ? "Principal" : instanceCtx.activeHouseholdName

  return (
    <Sidebar collapsible="icon">
      {/* ── Header / Logo ─────────────────────────────────────────── */}
      <SidebarHeader className="h-14 justify-center p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/avatar.jpeg"
                  alt="Finanzas Camperas"
                  className="flex aspect-square size-8 shrink-0 rounded-lg object-cover"
                />
                {/* Fade out on icon mode; whitespace-nowrap prevents wrapping during animation */}
                <div className="flex flex-col gap-0.5 leading-none whitespace-nowrap overflow-hidden transition-[opacity] duration-150 group-data-[collapsible=icon]:opacity-0">
                  <span className="text-sm font-semibold">Finanzas Camperas</span>
                  <span className="text-xs text-sidebar-foreground/50">Panel de control</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <div className="px-2">
        <Separator className="bg-sidebar-foreground/20" />
      </div>

      {/* ── Instance switcher ─────────────────────────────────────── */}
      {hasMultipleInstances && (
        <div className="px-2 py-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Cambiar instancia"
                    disabled={isPending}
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Building2 className="size-4 shrink-0" />
                    <span className="truncate text-xs font-medium">{instanceLabel}</span>
                    {isPending
                      ? <Spinner className="ml-auto size-3.5 shrink-0" />
                      : <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-60" />
                    }
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="min-w-52 w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Instancias disponibles
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {instanceCtx.availableInstances.map((inst) => (
                    <DropdownMenuItem
                      key={inst.id}
                      disabled={isPending || inst.id === instanceCtx.activeHouseholdId}
                      className="cursor-pointer"
                      onClick={() => handleSwitchInstance(inst.id)}
                    >
                      <Building2 className="mr-2 size-4 shrink-0" />
                      <span className="truncate">{inst.isMain ? "Principal" : inst.name}</span>
                      {inst.id === instanceCtx.activeHouseholdId && (
                        <Check className="ml-auto size-4 shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator className="bg-sidebar-foreground/20 mt-1.5" />
        </div>
      )}

      {/* ── Navigation groups ─────────────────────────────────────── */}
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-0">
            {/* Section header: h-8 container that cross-fades label ↔ separator */}
            {/* Always same DOM structure to avoid React useId hydration mismatch */}
            <div className="relative flex h-8 items-center overflow-hidden px-2">
              {/* Mobile: always just a separator */}
              <div className="flex w-full md:hidden">
                <Separator className="bg-sidebar-foreground/20" />
              </div>
              {/* Desktop: label when expanded, separator when collapsed */}
              <span
                className="hidden md:block whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 transition-opacity duration-150"
                style={{ opacity: open ? 1 : 0 }}
              >
                {group.label}
              </span>
              <div
                className="absolute inset-x-2 hidden md:block transition-opacity duration-150"
                style={{ opacity: open ? 0 : 1 }}
              >
                <Separator className="bg-sidebar-foreground/20" />
              </div>
            </div>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, icon: Icon, label, exact, description }) => {
                  const isActive = exact ? pathname === href : pathname.startsWith(href)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                        <Link href={href} onClick={handleNavClick}>
                          <Icon />
                          {description ? (
                            <span className="flex flex-col gap-0 leading-tight">
                              <span>{label}</span>
                              <span className="text-[10px] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
                                {description}
                              </span>
                            </span>
                          ) : (
                            <span>{label}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer / User menu ────────────────────────────────────── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {user.imageUrl && (
                      <AvatarImage src={user.imageUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {user.imageUrl && (
                        <AvatarImage src={user.imageUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="rounded-lg text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <SignOutButton redirectUrl="/sign-in">
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 size-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </SignOutButton>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
