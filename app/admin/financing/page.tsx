import { and, desc, eq } from "drizzle-orm";
import { ArrowRight, CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { financingRequests, notifications, orders, vehicles } from "@/db/schema";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  NEW: "Шинэ",
  UNDER_REVIEW: "Шалгаж байна",
  APPROVED: "Зөвшөөрсөн",
  DECLINED: "Татгалзсан",
};
const requestTypeLabels: Record<string, string> = { VEHICLE_BALANCE: "Автомашины үлдэгдэл 70%", CUSTOMS_TAX: "Гааль, татвар" };

function money(value: number) {
  return `${value.toLocaleString("mn-MN")} ₮`;
}

export default async function AdminFinancingDashboard() {
  const user = await requireAdminPermission("/admin/financing", "FINANCING_VIEW");
  const db = getDb();
  const [requestRows, unreadRows] = await Promise.all([
    db.select({ financing: financingRequests, order: orders, vehicle: vehicles })
      .from(financingRequests)
      .innerJoin(orders, eq(financingRequests.orderId, orders.id))
      .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
      .orderBy(desc(financingRequests.createdAt))
      .limit(100),
    db.select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.recipientType, "ADMIN"), eq(notifications.isRead, false))),
  ]);
  const rows = requestRows.map(({ financing, order, vehicle }) => ({
    ...financing,
    orderNo: order.orderNo ?? order.id,
    customerName: order.customerName ?? financing.customerEmail,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
  }));
  const pending = rows.filter(row => ["NEW", "UNDER_REVIEW"].includes(row.status)).length;
  const approved = rows.filter(row => row.status === "APPROVED").length;
  const declined = rows.filter(row => row.status === "DECLINED").length;

  return (
    <DashboardShell role="admin" title="Санхүүжилтийн хяналт" subtitle="Админ хүсэлтийн явцыг хянаж, ББСБ-ын шийдвэрийг нэг дороос харна." userName={user.displayName} userCode={user.email} unreadCount={unreadRows.length} notificationHref="/admin/notifications" adminPermissions={user.permissions} isSystemAdmin={user.isAdmin}>
      <section className="stat-grid admin-stats">
        <article className="stat-card"><div className="stat-icon blue"><FileText size={20} /></div><span>Нийт хүсэлт</span><strong>{rows.length}</strong><small>Сүүлийн 100 хүсэлт</small></article>
        <article className="stat-card"><div className="stat-icon amber"><Clock3 size={20} /></div><span>Хүлээгдэж буй</span><strong>{pending}</strong><small>ББСБ шалгаж байна</small></article>
        <article className="stat-card"><div className="stat-icon green"><CheckCircle2 size={20} /></div><span>Зөвшөөрсөн</span><strong>{approved}</strong><small>Санхүүжилт батлагдсан</small></article>
        <article className="stat-card"><div className="stat-icon violet"><XCircle size={20} /></div><span>Татгалзсан</span><strong>{declined}</strong><small>Эцэслэгдсэн хүсэлт</small></article>
      </section>

      <section className="dashboard-panel admin-table-panel order-table-panel" id="financing-requests">
        <div className="dashboard-section-heading"><div><span>САНХҮҮЖИЛТИЙН ХҮСЭЛТ</span><h2>ББСБ-д илгээгдсэн хүсэлтүүд</h2></div><span className="live-data-chip">LIVE DATA · {rows.length}</span></div>
        {rows.length ? <div className="financing-admin-list">{rows.map(row => <article className="financing-admin-row" key={row.id}>
          <div><span className="financing-admin-order">{row.orderNo}</span><h3>{row.vehicleName}</h3><p>{requestTypeLabels[row.requestType] ?? row.requestType} · {row.customerName} · {row.customerEmail}</p></div>
          <div><small>Хүссэн дүн</small><strong>{money(row.requestedAmountMnt)}</strong></div>
          <div><small>Зөвшөөрсөн</small><strong>{row.approvedAmountMnt ? money(row.approvedAmountMnt) : "—"}</strong></div>
          <div><small>Хугацаа</small><strong>{row.termMonths} сар</strong></div>
          <div><small>Төлөв</small><b className={`financing-status ${row.status.toLowerCase()}`}>{row.status === "APPROVED" ? <CheckCircle2/> : row.status === "DECLINED" ? <XCircle/> : <Clock3/>}{statusLabels[row.status] ?? row.status}</b></div>
          <a className="payment-manage-link" href={`/admin/orders/${encodeURIComponent(row.orderId)}`}>Захиалга харах <ArrowRight /></a>
        </article>)}</div> : <div className="quote-empty compact"><FileText/><h3>Санхүүжилтийн хүсэлт одоогоор алга</h3><p>Админ захиалгыг баталгаажуулсны дараа хэрэглэгч хүсэлт илгээнэ.</p></div>}
      </section>
    </DashboardShell>
  );
}
