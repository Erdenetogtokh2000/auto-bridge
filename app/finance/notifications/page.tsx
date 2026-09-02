import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { NotificationList } from "@/app/components/notification-list";
import { requireFinancePermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function FinanceNotifications() {
  const user = await requireFinancePermission("/finance/notifications", "FINANCE_NOTIFICATIONS_VIEW");
  const db = getDb();
  const [rows, unread] = await Promise.all([
    db.select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, href: notifications.href, isRead: notifications.isRead, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.recipientType, "FINANCE")).orderBy(desc(notifications.createdAt)).limit(100),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "FINANCE"), eq(notifications.isRead, false))),
  ]);
  return <DashboardShell role="finance" title="Санхүүжилтийн мэдэгдэл" subtitle="Хэрэглэгчийн санхүүжилтийн хүсэлт болон шийдвэрийн шинэчлэлтүүд." userName={user.displayName} userCode={user.email} unreadCount={unread.length} notificationHref="/finance/notifications" rolePermissions={user.permissions}><NotificationList notifications={rows} scope="FINANCE" /></DashboardShell>;
}
