import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { NotificationList } from "@/app/components/notification-list";
import { requireTransportPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function TransportNotifications() {
  const user = await requireTransportPermission("/transport/notifications", "TRANSPORT_NOTIFICATIONS_VIEW");
  const db = getDb();
  const email = user.email.toLowerCase();
  const [rows, unread] = await Promise.all([
    db.select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, href: notifications.href, isRead: notifications.isRead, createdAt: notifications.createdAt })
      .from(notifications)
      .where(and(eq(notifications.recipientType, "TRANSPORT"), eq(notifications.recipientEmail, email)))
      .orderBy(desc(notifications.createdAt)).limit(100),
    db.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.recipientType, "TRANSPORT"), eq(notifications.recipientEmail, email), eq(notifications.isRead, false))),
  ]);
  return <DashboardShell role="transport" title="Тээврийн мэдэгдэл" subtitle="Танд хуваарилагдсан тээвэр болон админы шинэчлэлтүүд." userName={user.displayName} userCode={user.email} unreadCount={unread.length} notificationHref="/transport/notifications" rolePermissions={user.permissions}><NotificationList notifications={rows} scope="TRANSPORT" /></DashboardShell>;
}
