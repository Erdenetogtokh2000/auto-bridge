"use client";

import { usePathname } from "next/navigation";
import {
  Bell, CalendarDays, CarFront, ChevronDown, ClipboardList, FileText,
  LayoutDashboard, LogOut, PackageCheck, ReceiptText, Search, Settings,
  Ship, Users, WalletCards,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import type { LucideIcon } from "lucide-react";
import type { AdminPermission } from "@/lib/admin-permissions";
import type { UserPermission } from "@/lib/role-permissions";
import { BrandLogo } from "@/app/components/brand-logo";

type Role = "customer" | "admin" | "transport" | "finance";

const roleConfig = {
  customer: {
    label: "Харилцагч",
    name: "Б. Батбаяр",
    code: "C-00241",
    items: [
      ["Хяналтын самбар", "/portal", LayoutDashboard, "CUSTOMER_DASHBOARD_VIEW"],
      ["Миний автомашинууд", "/portal#orders", CarFront, "CUSTOMER_ORDERS_VIEW"],
      ["Үнийн санал", "/portal/quotes", ReceiptText, "CUSTOMER_QUOTES_VIEW"],
      ["Захиалгын түүх", "/portal/orders", ClipboardList, "CUSTOMER_ORDERS_VIEW"],
      ["Төлбөр ба нэхэмжлэх", "/portal#payments", WalletCards, "CUSTOMER_ORDERS_VIEW"],
      ["Санхүүжилт", "/portal/financing", WalletCards, "CUSTOMER_FINANCING_REQUEST"],
      ["Тээврийн явц", "/portal#shipping", Ship, "CUSTOMER_ORDERS_VIEW"],
      ["Бичиг баримт", "/portal#documents", FileText, "CUSTOMER_DOCUMENT_DOWNLOAD"],
      ["Мэдэгдэл", "/portal/notifications", Bell, "CUSTOMER_NOTIFICATIONS_VIEW"],
    ],
  },
  admin: {
    label: "Системийн админ",
    name: "AUTO BRIDGE",
    code: "ADMIN",
    items: [
      ["Хяналтын самбар", "/admin", LayoutDashboard, "DASHBOARD_VIEW"],
      ["Үнийн хүсэлт", "/admin#quotes", ReceiptText, "QUOTES_MANAGE"],
      ["Захиалга", "/admin#orders", ClipboardList, "ORDERS_MANAGE"],
      ["Автомашин", "/admin/vehicles", CarFront, "CATALOG_MANAGE"],
      ["Хэрэглэгч ба эрх", "/admin/users", Users, undefined, true],
      ["Төлбөр", "/admin#orders", WalletCards, "ORDERS_MANAGE"],
      ["Тээвэр", "/admin#orders", Ship, "ORDERS_MANAGE"],
      ["Мэдэгдэл", "/admin/notifications", Bell, "NOTIFICATIONS_MANAGE"],
      ["Авто экспо", "/admin/expos", CalendarDays, "EXPOS_MANAGE"],
      ["Санхүүжилт", "/admin/financing", WalletCards, "FINANCING_VIEW"],
      ["Тайлан", "/admin/reports", FileText, "REPORTS_VIEW"],
    ],
  },
  transport: {
    label: "Тээврийн ажилтан",
    name: "Их нуруу логистик",
    code: "LOGISTICS",
    items: [
      ["Ажлын самбар", "/transport", LayoutDashboard, "TRANSPORT_ASSIGNED_VIEW"],
      ["Миний тээврүүд", "/transport#shipments", Ship, "TRANSPORT_ASSIGNED_VIEW"],
      ["Контейнер", "/transport#containers", PackageCheck, "TRANSPORT_ASSIGNED_VIEW"],
      ["Бичиг баримт", "/transport#documents", FileText, "TRANSPORT_ASSIGNED_VIEW"],
      ["Төлөв шинэчлэх", "/transport#updates", ClipboardList, "TRANSPORT_STATUS_UPDATE"],
      ["Мэдэгдэл", "/transport/notifications", Bell, "TRANSPORT_NOTIFICATIONS_VIEW"],
    ],
  },
  finance: {
    label: "Санхүүгийн ажилтан",
    name: "Санхүүжилтийн баг",
    code: "FINANCE",
    items: [
      ["Хяналтын самбар", "/finance", LayoutDashboard, "FINANCE_REQUEST_VIEW"],
      ["Санхүүжилтийн хүсэлт", "/finance#requests", WalletCards, "FINANCE_REQUEST_VIEW"],
      ["Мэдэгдэл", "/finance/notifications", Bell, "FINANCE_NOTIFICATIONS_VIEW"],
    ],
  },
} as const;

export function DashboardShell({ role, title, subtitle, userName, userCode, unreadCount = 0, notificationHref, adminPermissions = [], rolePermissions, isSystemAdmin = false, children }: { role: Role; title: string; subtitle: string; userName?: string; userCode?: string; unreadCount?: number; notificationHref?: string; adminPermissions?: AdminPermission[]; rolePermissions?: UserPermission[]; isSystemAdmin?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const config = roleConfig[role];
  const menuItems = (config.items as readonly (readonly [string, string, LucideIcon, UserPermission?, boolean?])[]).filter(([, , , permission, adminOnly]) => {
    if (role !== "admin") return !rolePermissions || !permission || rolePermissions.includes(permission);
    if (adminOnly) return isSystemAdmin;
    return isSystemAdmin || !permission || adminPermissions.includes(permission as AdminPermission);
  });
  const roleLabel = role === "admin" && !isSystemAdmin ? "Менежер" : config.label;
  const notificationPermission: Partial<Record<Role, UserPermission>> = { customer: "CUSTOMER_NOTIFICATIONS_VIEW", transport: "TRANSPORT_NOTIFICATIONS_VIEW", finance: "FINANCE_NOTIFICATIONS_VIEW" };
  const canUseNotifications = role === "admin"
    ? isSystemAdmin || adminPermissions.includes("NOTIFICATIONS_MANAGE")
    : !rolePermissions || !notificationPermission[role] || rolePermissions.includes(notificationPermission[role]!);
  const displayName = userName ?? config.name;
  const displayCode = userCode ?? config.code;
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="dashboard-sidebar border-r-0">
        <SidebarHeader className="dashboard-brand-wrap">
          <a href="/" className="dashboard-brand">
            <BrandLogo className="dashboard-brand-logo" />
          </a>
        </SidebarHeader>
        <SidebarContent className="dashboard-nav">
          <SidebarGroup>
            <SidebarGroupLabel className="dashboard-nav-label">ҮНДСЭН ЦЭС</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map(([label, href, Icon]) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton asChild isActive={pathname === href} tooltip={label} className="dashboard-nav-button">
                      <a href={href}><Icon /><span>{label}</span></a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="dashboard-footer">
          {role === "admin" && (isSystemAdmin || adminPermissions.includes("SETTINGS_MANAGE")) && <a href="/admin/settings"><Settings size={17} /><span>Тохиргоо</span></a>}
          <a href="/logout"><LogOut size={17} /><span>Гарах</span></a>
          <div className="dashboard-user">
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
            <div><strong>{displayName}</strong><small>{displayCode}</small></div>
            <ChevronDown size={15} />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="dashboard-inset">
        <header className="dashboard-topbar">
          <div className="dashboard-title-wrap">
            <SidebarTrigger className="dashboard-trigger" />
            <div><span>{roleLabel}</span><h1>{title}</h1></div>
          </div>
          <div className="dashboard-actions">
            <label><Search size={17} /><input aria-label="Хайх" placeholder="Хайх..." /></label>
            {canUseNotifications&&<a className="dashboard-notification-link" aria-label="Мэдэгдэл" href={notificationHref ?? (role==="admin"?"/admin/notifications":role==="customer"?"/portal/notifications":"/transport")}><Bell size={18} />{unreadCount>0&&<i>{unreadCount>99?"99+":unreadCount}</i>}</a>}
            <span className="role-chip">{roleLabel}</span>
          </div>
        </header>
        <div className="dashboard-content">
          <p className="dashboard-subtitle">{subtitle}</p>
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </SidebarInset>
    </SidebarProvider>
  );
}
