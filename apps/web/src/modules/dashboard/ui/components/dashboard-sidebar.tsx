"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  CreditCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  Mic,
  PaletteIcon,
  HomeIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  Separator,
} from "@repo/ui";

import { useClerkTheme } from "@/hooks/use-clerk-theme";

const rootItems = [
  {
    title: "item-home",
    url: "/",
    icon: HomeIcon,
  },
];

const customerSupportItems = [
  {
    title: "item-conversations",
    url: "/conversations",
    icon: InboxIcon,
  },
  {
    title: "item-files",
    url: "/files",
    icon: LibraryBigIcon,
  },
];

const configurationItems = [
  {
    title: "item-customization",
    url: "/customization",
    icon: PaletteIcon,
  },
  {
    title: "item-integrations",
    url: "/integrations",
    icon: LayoutDashboardIcon,
  },
  {
    title: "item-vapi",
    url: "/plugins/vapi",
    icon: Mic,
  },
];

const accountItems = [
  {
    title: "item-billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

export const DashbardSidebar = () => {
  const clerkTheme = useClerkTheme();

  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(url);
  };

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg"></SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <div className="px-4 py-1">
        <Separator className="opacity-100 text-muted-foreground" />
      </div>
      <SidebarContent>
        {/* Customer Support */}
        <SidebarGroup>
          <SidebarGroupLabel>{"h0"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={"h"}
                  >
                    <Link href={item.url}>
                      <item.icon size="4" />
                      <span>h2</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Customer Support */}
        <SidebarGroup>
          <SidebarGroupLabel>{"h3"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerSupportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={"h3"}
                  >
                    <Link href={item.url}>
                      <item.icon size="4" />
                      <span>{"h4"}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>{"h8"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configurationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={"h6"}
                  >
                    <Link href={item.url}>
                      <item.icon size="4" />
                      <span>{"h7"}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>{"h9"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon size="4" />
                      <span>th10</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="px-4 py-1">
        <Separator className="opacity-100 text-muted-foreground" />
      </div>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                baseTheme: clerkTheme,
                elements: {
                  rootBox: "w-full! h-8!",
                  userButtonTrigger:
                    "w-full! p-2! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                  userButtonBox:
                    "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                  userButtonOuterIdentifier:
                    "pl-0! group-data-[collapsible=icon]:hidden!",
                  avatarBox: "size-6!",
                },
              }}
              userProfileProps={{ appearance: { baseTheme: clerkTheme } }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
