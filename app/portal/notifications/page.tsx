import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { NotificationList } from "@/app/components/notification-list";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";
export default async function CustomerNotifications() {
  const user = await requireCustomerPermission(
    "/portal/notifications",
    "CUSTOMER_NOTIFICATIONS_VIEW",
  );
  const rows = await getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientType, "CUSTOMER"),
        eq(notifications.recipientEmail, user.email.toLowerCase()),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  const unread = rows.filter((item) => !item.isRead).length;
  return (
    <DashboardShell
      role="customer"
      title="Миний мэдэгдэл"
      subtitle="Төлбөр, бичиг баримт, тээвэр болон захиалгын шинэчлэлүүд."
      userName={user.displayName}
      userCode={user.email}
      unreadCount={unread}
      notificationHref="/portal/notifications"
      rolePermissions={user.permissions}
    >
      <NotificationList notifications={rows} scope="CUSTOMER" />
    </DashboardShell>
  );
}
