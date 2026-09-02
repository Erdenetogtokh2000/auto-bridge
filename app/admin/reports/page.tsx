import { and, desc, eq } from "drizzle-orm";
import { Activity, BarChart3, CheckCircle2, ClipboardList, FileCheck2, PackageCheck, ShieldCheck, WalletCards } from "lucide-react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders, payments, quoteRequests, shipments } from "@/db/schema";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("mn-MN");
const date = (value: string | null) => value ? new Intl.DateTimeFormat("mn-MN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`)) : "—";

export default async function AdminReportsPage() {
  const admin = await requireAdminPermission("/admin/reports", "REPORTS_VIEW");
  const db = getDb();
  const [quoteRows, orderRows, paymentRows, shipmentRows, documentRows, activityRows] = await Promise.all([
    db.select({ id: quoteRequests.id, status: quoteRequests.status }).from(quoteRequests),
    db.select({ id: orders.id, status: orders.status, total: orders.totalAmountMnt, balance: orders.balanceAmountMnt, createdAt: orders.createdAt }).from(orders),
    db.select({ id: payments.id, orderId: payments.orderId, type: payments.paymentType, status: payments.status, amountMnt: payments.amountMnt }).from(payments),
    db.select({ id: shipments.id, orderId: shipments.orderId, status: shipments.status, updatedAt: shipments.updatedAt, updatedBy: shipments.updatedBy }).from(shipments),
    db.select({ id: documents.id, type: documents.documentType, status: documents.status, fileName: documents.fileName, uploadedBy: documents.uploadedBy, createdAt: documents.createdAt }).from(documents),
    db.select({ id: notifications.id, title: notifications.title, message: notifications.message, actorEmail: notifications.actorEmail, orderId: notifications.orderId, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.recipientType, "ADMIN")).orderBy(desc(notifications.createdAt)).limit(30),
  ]);
  const paid = paymentRows.filter(item => item.status === "PAID").reduce((sum, item) => sum + Number(item.amountMnt || 0), 0);
  const pending = paymentRows.filter(item => item.status !== "PAID").reduce((sum, item) => sum + Number(item.amountMnt || 0), 0);
  const waitingOrders = orderRows.filter(item => item.balance > 0 || ["QUOTE", "PENDING", "CONFIRMED"].includes(item.status)).length;
  const delivered = shipmentRows.filter(item => ["DELIVERED", "ARRIVED"].includes(item.status)).length;
  const activity = activityRows.map(item => ({ id: item.id, title: item.title, actor: item.actorEmail ?? "Систем", createdAt: item.createdAt, detail: item.orderId ? `Захиалга: ${item.orderId}` : item.message })).slice(0, 12);
  return <DashboardShell role="admin" title="Тайлан ба аюулгүй байдал" subtitle="Борлуулалт, төлбөр, захиалга болон тээврийн гүйцэтгэлийг нэгтгэн хянана." userName={admin.displayName} userCode={admin.email} notificationHref="/admin/notifications" adminPermissions={admin.permissions} isSystemAdmin={admin.isAdmin}>
    <section className="stat-grid report-stats"><article className="stat-card"><div className="stat-icon blue"><BarChart3/></div><span>Нийт борлуулалтын дүн</span><strong>{money.format(orderRows.reduce((sum, item) => sum + Number(item.total || 0), 0))} ₮</strong><small>{orderRows.length} захиалга</small></article><article className="stat-card"><div className="stat-icon green"><CheckCircle2/></div><span>Төлөгдсөн дүн</span><strong>{money.format(paid)} ₮</strong><small>{paymentRows.filter(item => item.status === "PAID").length} гүйлгээ</small></article><article className="stat-card"><div className="stat-icon amber"><WalletCards/></div><span>Хүлээгдэж буй төлбөр</span><strong>{money.format(pending)} ₮</strong><small>{paymentRows.filter(item => item.status !== "PAID").length} гүйлгээ</small></article><article className="stat-card"><div className="stat-icon violet"><PackageCheck/></div><span>Хүлээгдэж буй захиалга</span><strong>{waitingOrders}</strong><small>Үлдэгдэлтэй эсвэл явцтай</small></article></section>
    <div className="report-grid"><section className="dashboard-panel"><div className="panel-heading"><div><span>ҮЙЛ АЖИЛЛАГААНЫ ТАЙЛАН</span><h2>Процессын гүйцэтгэл</h2></div><Activity/></div><div className="report-breakdown"><div><span>Үнийн хүсэлт</span><b>{quoteRows.length}</b><small>{quoteRows.filter(item => item.status === "QUOTE_READY").length} санал бэлэн</small></div><div><span>Тээвэр</span><b>{shipmentRows.length}</b><small>{delivered} хүргэлт дууссан</small></div><div><span>Бичиг баримт</span><b>{documentRows.length}</b><small>{documentRows.filter(item => item.status === "VERIFIED").length} баталгаажсан</small></div><div><span>Төлбөр</span><b>{paymentRows.length}</b><small>{paymentRows.filter(item => item.status === "PAID").length} төлөгдсөн</small></div></div></section><section className="dashboard-panel"><div className="panel-heading"><div><span>ӨГӨГДЛИЙН ХАМГААЛАЛТ</span><h2>Хяналтын төлөв</h2></div><ShieldCheck/></div><div className="security-check-list"><p><CheckCircle2/> Админ эрхээр хамгаалагдсан</p><p><CheckCircle2/> Файлын таталт захиалгаар хязгаарлагдсан</p><p><CheckCircle2/> Мэдэгдэл, баримтын цагийн бүртгэл хадгалагдсан</p><p><CheckCircle2/> Үлдэгдэл болон төлбөрийн дүн автоматаар тооцогдоно</p></div></section></div>
    <section className="dashboard-panel admin-table-panel"><div className="dashboard-section-heading"><div><span>АДМИНЫ ҮЙЛДЛИЙН ТҮҮХ</span><h2>Сүүлийн үйлдлүүд</h2></div><span className="live-data-chip">LIVE DATA · {activity.length}</span></div>{activity.length ? <div className="report-activity-list">{activity.map(item => <div className="report-activity-row" key={item.id}><div><Activity/></div><span><strong>{item.title}</strong><small>{item.detail}</small></span><b>{item.actor}<small>{date(item.createdAt)}</small></b></div>)}</div> : <div className="panel-empty">Админы бүртгэлтэй үйлдэл одоогоор алга.</div>}</section>
    <section className="dashboard-panel admin-table-panel"><div className="dashboard-section-heading"><div><span>ТӨЛБӨРИЙН ЗАДАРГАА</span><h2>Төлбөрийн төрлөөр</h2></div><span className="live-data-chip">{paymentRows.length} гүйлгээ</span></div><div className="report-payment-grid">{["DEPOSIT", "VEHICLE", "SHIPPING", "CUSTOMS", "OTHER"].map(type => { const rows = paymentRows.filter(item => item.type === type); return <div key={type}><span>{type === "DEPOSIT" ? "Барьцаа" : type === "VEHICLE" ? "Машин" : type === "SHIPPING" ? "Тээвэр" : type === "CUSTOMS" ? "Гааль, татвар" : "Бусад"}</span><strong>{money.format(rows.reduce((sum, item) => sum + Number(item.amountMnt || 0), 0))} ₮</strong><small>{rows.filter(item => item.status === "PAID").length}/{rows.length} төлөгдсөн</small></div>; })}</div></section>
  </DashboardShell>;
}
