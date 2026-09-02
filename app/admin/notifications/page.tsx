import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { NotificationList } from "@/app/components/notification-list";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminNotifications() {
  const user = await requireAdminPermission("/admin/notifications", "NOTIFICATIONS_MANAGE");
  const rows = await getDb().select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, href: notifications.href, isRead: notifications.isRead, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.recipientType, "ADMIN")).orderBy(desc(notifications.createdAt)).limit(100);
  const unreadRows = await getDb().select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false)));
  return <DashboardShell role="admin" title="Админы мэдэгдэл" subtitle="Шинэ хүсэлт болон системийн үйл явдлын нэгдсэн жагсаалт." userName={user.displayName} userCode={user.email} unreadCount={unreadRows.length} notificationHref="/admin/notifications" adminPermissions={user.permissions} isSystemAdmin={user.isAdmin}><NotificationList notifications={rows} scope="ADMIN"/></DashboardShell>;
}
