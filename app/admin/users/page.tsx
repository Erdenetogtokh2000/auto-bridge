import { and, desc, eq, sql } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { UserManager, type ManagedUser } from "@/app/components/user-manager";
import { requireAdmin } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, userProfiles } from "@/db/schema";
import { Building2, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { defaultPermissionsForRole, effectivePermissionsForRole, type PermissionRole } from "@/lib/role-permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin("/admin/users");
  const db = getDb();
  const [profiles, orderCustomers, unreadRows] = await Promise.all([
    db.select().from(userProfiles).orderBy(desc(userProfiles.createdAt)),
    db.select({ email: orders.customerEmail, fullName: sql<string>`max(${orders.customerName})`, phone: sql<string>`max(${orders.customerPhone})`, orderCount: sql<number>`count(*)`, lastOrderAt: sql<string>`max(${orders.createdAt})` }).from(orders).groupBy(orders.customerEmail),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false))),
  ]);
  const customerMap = new Map(orderCustomers.map(customer => [customer.email.toLowerCase(), customer]));
  const rows: ManagedUser[] = profiles.map(profile => {
    const customer = customerMap.get(profile.email.toLowerCase());
    customerMap.delete(profile.email.toLowerCase());
    const isCurrent = profile.email.toLowerCase() === admin.email.toLowerCase();
    return { id: profile.id, email: profile.email, fullName: profile.fullName ?? customer?.fullName ?? profile.email, phone: profile.phone ?? customer?.phone ?? null, role: (isCurrent ? "ADMIN" : profile.role) as ManagedUser["role"], permissions: isCurrent ? defaultPermissionsForRole("ADMIN") : effectivePermissionsForRole(profile.role as PermissionRole, profile.permissions, profile.permissionsCustomized), permissionsCustomized: isCurrent ? false : profile.permissionsCustomized, status: (isCurrent ? "ACTIVE" : profile.status) as ManagedUser["status"], companyName: profile.companyName, companyRegistrationNo: profile.companyRegistrationNo, financingEligible: profile.financingEligible, notes: profile.notes, orderCount: Number(customer?.orderCount ?? 0), lastOrderAt: customer?.lastOrderAt ?? null };
  });
  for (const customer of customerMap.values()) rows.push({ id: null, email: customer.email.toLowerCase(), fullName: customer.fullName ?? customer.email, phone: customer.phone ?? null, role: "CUSTOMER", permissions: defaultPermissionsForRole("CUSTOMER"), permissionsCustomized: false, status: "ACTIVE", companyName: null, companyRegistrationNo: null, financingEligible: false, notes: null, orderCount: Number(customer.orderCount), lastOrderAt: customer.lastOrderAt });
  if (!rows.some(row => row.email === admin.email.toLowerCase())) rows.unshift({ id: null, email: admin.email.toLowerCase(), fullName: admin.displayName, phone: null, role: "ADMIN", permissions: defaultPermissionsForRole("ADMIN"), permissionsCustomized: false, status: "ACTIVE", companyName: "AUTO BRIDGE", companyRegistrationNo: null, financingEligible: false, notes: null, orderCount: 0, lastOrderAt: null });
  const activeCount = rows.filter(row => row.status === "ACTIVE").length;
  const managerCount = rows.filter(row => row.role === "DEALER" || row.role === "MANAGER").length;
  const staffCount = rows.filter(row => row.role === "ADMIN" || row.role === "MANAGER" || row.role === "TRANSPORT" || row.role === "FINANCE").length;

  return <DashboardShell role="admin" title="Хэрэглэгч ба эрх" subtitle="Харилцагч, менежер, ББСБ болон тээврийн ажилтны үйлдэл бүрийн эрхийг удирдана." userName={admin.displayName} userCode={admin.email} unreadCount={unreadRows.length} notificationHref="/admin/notifications" isSystemAdmin>
    <section className="stat-grid user-stats"><article className="stat-card"><div className="stat-icon blue"><UsersRound/></div><span>Нийт хэрэглэгч</span><strong>{rows.length}</strong><small>Бүртгэл ба захиалгаас</small></article><article className="stat-card"><div className="stat-icon green"><UserRoundCheck/></div><span>Идэвхтэй</span><strong>{activeCount}</strong><small>Систем ашиглах боломжтой</small></article><article className="stat-card"><div className="stat-icon violet"><Building2/></div><span>Менежер</span><strong>{managerCount}</strong><small>Админаас модуль хуваарилсан</small></article><article className="stat-card"><div className="stat-icon amber"><ShieldCheck/></div><span>Ажилтан ба админ</span><strong>{staffCount}</strong><small>Дотоод эрхтэй хэрэглэгч</small></article></section>
    <UserManager users={rows} currentEmail={admin.email.toLowerCase()}/>
  </DashboardShell>;
}
