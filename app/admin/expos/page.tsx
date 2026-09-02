import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { ExpoManager, type ManagedExpo } from "@/app/components/expo-manager";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { expos, notifications } from "@/db/schema";
import { CalendarCheck2, CalendarDays, Eye, Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminExposPage() {
  const admin = await requireAdminPermission("/admin/expos", "EXPOS_MANAGE");
  const db = getDb();
  const [rows, unread] = await Promise.all([
    db.select().from(expos).orderBy(desc(expos.startDate)),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false))),
  ]);
  const managed: ManagedExpo[] = rows.map(row => ({ id: row.id, title: row.title, country: row.country, city: row.city, venue: row.venue, startDate: row.startDate, endDate: row.endDate, officialUrl: row.officialUrl, videoUrl: row.videoUrl, region: row.region as ManagedExpo["region"], category: row.category, description: row.description, registrationDeadline: row.registrationDeadline, ticketInfo: row.ticketInfo, participationTerms: row.participationTerms, imageUrl: row.imageUrl, imageObjectKey: row.imageObjectKey, isFeatured: row.isFeatured, isPublished: row.isPublished }));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = managed.filter(row => row.endDate >= today).length;
  const published = managed.filter(row => row.isPublished).length;
  const countries = new Set(managed.map(row => row.country)).size;
  return <DashboardShell role="admin" title="Олон улсын авто экспо" subtitle="Үзэсгэлэнгийн календарь, сурталчилгаа болон албан ёсны мэдээллийг удирдана." userName={admin.displayName} userCode={admin.email} unreadCount={unread.length} notificationHref="/admin/notifications" adminPermissions={admin.permissions} isSystemAdmin={admin.isAdmin}>
    <section className="stat-grid expo-admin-stats"><article className="stat-card"><div className="stat-icon blue"><CalendarDays/></div><span>Нийт экспо</span><strong>{managed.length}</strong><small>Календарийн бүх бүртгэл</small></article><article className="stat-card"><div className="stat-icon green"><CalendarCheck2/></div><span>Удахгүй болох</span><strong>{upcoming}</strong><small>Одоогоор идэвхтэй</small></article><article className="stat-card"><div className="stat-icon violet"><Eye/></div><span>Нийтэлсэн</span><strong>{published}</strong><small>Нийтийн экспо төвд</small></article><article className="stat-card"><div className="stat-icon amber"><Globe2/></div><span>Улс орон</span><strong>{countries}</strong><small>Олон улсын хамрах хүрээ</small></article></section>
    <ExpoManager expos={managed} today={today}/>
  </DashboardShell>;
}
