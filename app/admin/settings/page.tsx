import { and, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { AdminSettingsForm, type AdminSettings } from "@/app/components/admin-settings-form";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, systemSettings } from "@/db/schema";

export const dynamic = "force-dynamic";

const defaults: AdminSettings = {
  companyName: "AUTO BRIDGE",
  supportEmail: "erdenetogtokh2000@gmail.com",
  contactPhone: "7011-3322",
  officeHours: "Даваа–Баасан 09:00–18:00",
  krwMntRate: 2.55,
  usdMntRate: 3450,
  depositPercent: 30,
  paymentReminderDays: 3,
  emailNotifications: true,
  transportNotifications: true,
  documentNotifications: true,
  updatedBy: null,
  updatedAt: null,
};

export default async function AdminSettingsPage() {
  const admin = await requireAdminPermission("/admin/settings", "SETTINGS_MANAGE");
  const db = getDb();
  const [rows, unreadRows] = await Promise.all([
    db.select().from(systemSettings).where(eq(systemSettings.id, "default")).limit(1),
    db.select({ id: notifications.id }).from(notifications)
      .where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false))),
  ]);
  const settings: AdminSettings = rows[0] ? {
    companyName: rows[0].companyName,
    supportEmail: rows[0].supportEmail,
    contactPhone: rows[0].contactPhone,
    officeHours: rows[0].officeHours,
    krwMntRate: rows[0].krwMntRate,
    usdMntRate: rows[0].usdMntRate,
    depositPercent: rows[0].depositPercent,
    paymentReminderDays: rows[0].paymentReminderDays,
    emailNotifications: rows[0].emailNotifications,
    transportNotifications: rows[0].transportNotifications,
    documentNotifications: rows[0].documentNotifications,
    updatedBy: rows[0].updatedBy,
    updatedAt: rows[0].updatedAt,
  } : defaults;

  return <DashboardShell
    role="admin"
    title="Системийн тохиргоо"
    subtitle="Компанийн мэдээлэл, ханш, төлбөр болон мэдэгдлийн үндсэн дүрмийг удирдана."
    userName={admin.displayName}
    userCode={admin.email}
    unreadCount={unreadRows.length}
    notificationHref="/admin/notifications"
    adminPermissions={admin.permissions}
    isSystemAdmin={admin.isAdmin}
  >
    <AdminSettingsForm initialSettings={settings} />
  </DashboardShell>;
}
