import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { requireAdminStaff } from "@/app/chatgpt-auth";
import { QuoteActions } from "@/app/components/quote-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { notifications, orders, quoteEstimates, quoteRequests, vehicles } from "@/db/schema";
import { ArrowRight, CheckCircle2, CircleDollarSign, ClipboardList, Clock3, ExternalLink, Inbox, PackageCheck, ShieldCheck, Ship, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadQuotes() {
  try {
    const rows = await getDb().select({ quote: quoteRequests, estimateId: quoteEstimates.id })
      .from(quoteRequests)
      .leftJoin(quoteEstimates, eq(quoteRequests.id, quoteEstimates.quoteRequestId))
      .orderBy(desc(quoteRequests.createdAt)).limit(50);
    return rows.map(({ quote, estimateId }) => ({ ...quote, hasEstimate: Boolean(estimateId) }));
  }
  catch { return []; }
}

async function loadOrders() {
  try {
    return await getDb().select({ order: orders, vehicle: vehicles }).from(orders)
      .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).orderBy(desc(orders.createdAt)).limit(20);
  } catch { return []; }
}

async function loadUnreadNotifications() {
  try {
    return await getDb().select({id:notifications.id}).from(notifications)
      .where(and(eq(notifications.recipientType,"ADMIN"),eq(notifications.isRead,false)));
  } catch { return []; }
}

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export default async function AdminDashboard() {
  const actor = await requireAdminStaff("/admin");
  const canDashboard = actor.isAdmin || actor.permissions.includes("DASHBOARD_VIEW");
  const canQuotes = actor.isAdmin || actor.permissions.includes("QUOTES_MANAGE");
  const canOrders = actor.isAdmin || actor.permissions.includes("ORDERS_MANAGE");
  const canNotifications = actor.isAdmin || actor.permissions.includes("NOTIFICATIONS_MANAGE");
  const [quotes, orderRows, unreadRows] = await Promise.all([
    canQuotes || canDashboard ? loadQuotes() : [],
    canOrders || canDashboard ? loadOrders() : [],
    canNotifications ? loadUnreadNotifications() : [],
  ]);
  const newCount = quotes.filter(item => item.status === "NEW").length;
  const activeCount = quotes.filter(item => ["REVIEWING", "CONTACTED"].includes(item.status)).length;
  const readyCount = quotes.filter(item => item.status === "QUOTE_READY").length;
  const convertedCount = quotes.filter(item => item.status === "CONVERTED").length;
  const unassignedCount = quotes.filter(item => !item.assignedTo && item.status !== "CLOSED").length;
  const maxBar = Math.max(quotes.length, 1);

  return (
    <DashboardShell role="admin" title={actor.isAdmin?"Удирдлагын хяналтын самбар":"Менежерийн ажлын самбар"} subtitle={actor.isAdmin?"Нүүр хуудаснаас ирсэн үнийн хүсэлтийг бодит өгөгдлөөр удирдана.":"Админаас олгосон модуль болон ажлуудаа нэг дор удирдана."} userName={actor.displayName} userCode={actor.email} unreadCount={unreadRows.length} notificationHref="/admin/notifications" adminPermissions={actor.permissions} isSystemAdmin={actor.isAdmin}>
      {!actor.isAdmin&&!actor.permissions.length&&<section className="dashboard-panel quote-empty"><ShieldCheck/><h3>Танд одоогоор модуль эрх олгоогүй байна</h3><p>Системийн админ таны ажиллах модулиудыг сонгосны дараа цэс автоматаар нээгдэнэ.</p></section>}
      {canDashboard&&<>
      <section className="stat-grid admin-stats">
        <article className="stat-card"><div className="stat-icon blue"><Inbox size={20}/></div><span>Нийт үнийн хүсэлт</span><strong>{quotes.length}</strong><small>Сүүлийн 50 хүсэлт</small></article>
        <article className="stat-card"><div className="stat-icon amber"><Clock3 size={20}/></div><span>Шинэ хүсэлт</span><strong>{newCount}</strong><small>Шалгах шаардлагатай</small></article>
        <article className="stat-card"><div className="stat-icon violet"><UserCheck size={20}/></div><span>Боловсруулж байгаа</span><strong>{activeCount}</strong><small>Судалж буй ба холбогдсон</small></article>
        <article className="stat-card"><div className="stat-icon green"><CheckCircle2 size={20}/></div><span>Баталгаажсан захиалга</span><strong>{orderRows.length}</strong><small>Системд бүртгэлтэй</small></article>
      </section>

      <div className="dashboard-two-col admin-overview">
        <section className="dashboard-panel">
          <div className="panel-heading"><div><span>БОДИТ ӨГӨГДӨЛ</span><h2>Хүсэлтийн боловсруулалт</h2></div></div>
          <div className="operations-bars">
            <div><span>Шинэ</span><b>{newCount}</b><i><em style={{width:`${newCount/maxBar*100}%`}}/></i></div>
            <div><span>Боловсруулж байгаа</span><b>{activeCount}</b><i><em style={{width:`${activeCount/maxBar*100}%`}}/></i></div>
            <div><span>Үнийн санал бэлэн</span><b>{readyCount}</b><i><em style={{width:`${readyCount/maxBar*100}%`}}/></i></div>
            <div><span>Захиалга болсон</span><b>{convertedCount}</b><i><em style={{width:`${convertedCount/maxBar*100}%`}}/></i></div>
          </div>
        </section>
        <section className="dashboard-panel quote-next-actions">
          <div className="panel-heading"><div><span>ДАРААГИЙН ҮЙЛДЭЛ</span><h2>Анхаарах ажлууд</h2></div><ClipboardList size={20}/></div>
          <div className="admin-alert"><i className={newCount ? "critical" : "info"}/><span><strong>{newCount} шинэ хүсэлт судлах</strong><small>Зарын линк болон машины мэдээллийг шалгана</small></span><ArrowRight size={14}/></div>
          <div className="admin-alert"><i/><span><strong>{unassignedCount} хүсэлт ажилтангүй</strong><small>Хариуцсан нэгжийг сонгож хуваарилна</small></span><ArrowRight size={14}/></div>
          <div className="admin-alert"><i className="info"/><span><strong>{readyCount} санал илгээхэд бэлэн</strong><small>Үнийн саналын файлыг дараагийн шатанд холбоно</small></span><ArrowRight size={14}/></div>
        </section>
      </div>
      </>}

      {canQuotes&&<section className="dashboard-panel admin-table-panel quote-table-panel" id="quotes">
        <div className="dashboard-section-heading"><div><span>ҮНИЙН ХҮСЭЛТ</span><h2>Харилцагчаас ирсэн хүсэлтүүд</h2></div><span className="live-data-chip">LIVE DATA · {quotes.length}</span></div>
        {quotes.length ? (
          <Table className="admin-table quote-table">
            <TableHeader><TableRow><TableHead>ДУГААР / ОГНОО</TableHead><TableHead>ХАРИЛЦАГЧ</TableHead><TableHead>МАШИНЫ ЛИНК</TableHead><TableHead>ХАРИУЦСАН / ТӨЛӨВ / САНАЛ</TableHead></TableRow></TableHeader>
            <TableBody>{quotes.map(item=><TableRow key={item.id}>
              <TableCell><strong>{item.id}</strong><small>{formatDate(item.createdAt)}</small></TableCell>
              <TableCell><strong>{item.requesterName ?? "Нэр оруулаагүй"}</strong><small>{item.requesterPhone ?? "Утас оруулаагүй"}</small></TableCell>
              <TableCell><a className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Зарын эх сурвалж <ExternalLink size={13}/></a><small>{item.market}</small></TableCell>
              <TableCell><QuoteActions id={item.id} status={item.status} assignedTo={item.assignedTo} hasEstimate={item.hasEstimate}/></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        ) : (
          <div className="quote-empty"><Inbox size={31}/><h3>Үнийн хүсэлт хараахан ирээгүй байна</h3><p>Нүүр хуудасны машины линк, нэр, утасны хэсгийг бөглөж туршихад хүсэлт энд шууд нэмэгдэнэ.</p><a href="/#quote">Туршилтын хүсэлт илгээх <ArrowRight size={14}/></a></div>
        )}
      </section>}

      {canOrders&&<section className="dashboard-panel admin-table-panel order-table-panel" id="orders">
        <div className="dashboard-section-heading"><div><span>ЗАХИАЛГЫН БҮРТГЭЛ</span><h2>Баталгаажсан захиалгууд</h2></div><span className="live-data-chip">LIVE DATA · {orderRows.length}</span></div>
        {orderRows.length ? <Table className="admin-table quote-table order-table">
          <TableHeader><TableRow><TableHead>ЗАХИАЛГА</TableHead><TableHead>АВТОМАШИН</TableHead><TableHead>ХАРИЛЦАГЧ</TableHead><TableHead>ТӨЛБӨР / ТӨЛӨВ</TableHead></TableRow></TableHeader>
          <TableBody>{orderRows.map(({order,vehicle})=><TableRow key={order.id}>
            <TableCell><a className="admin-order-link" href={`/admin/orders/${encodeURIComponent(order.id)}`}>{order.orderNo ?? order.id}</a><small>{formatDate(order.createdAt)}</small></TableCell>
            <TableCell><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.productionYear} · {vehicle.mileageKm?.toLocaleString("mn-MN") ?? 0} км</small></TableCell>
            <TableCell><strong>{order.customerName ?? "Нэргүй"}</strong><small>{order.customerPhone ?? order.customerEmail}</small></TableCell>
            <TableCell><strong>{order.totalAmountMnt.toLocaleString("mn-MN")} ₮</strong><small className="order-status"><PackageCheck/> {order.status}</small><a className="payment-manage-link" href={`/admin/orders/${encodeURIComponent(order.id)}`}>Захиалга удирдах <ArrowRight/></a></TableCell>
          </TableRow>)}</TableBody>
        </Table> : <div className="quote-empty compact"><PackageCheck/><h3>Баталгаажсан захиалга алга</h3><p>Бэлэн үнийн саналыг “Захиалга болгох” үед энд автоматаар нэмэгдэнэ.</p></div>}
      </section>}

      <section className="admin-shortcuts">
        {canQuotes&&<a href="#quotes"><ClipboardList/><span><strong>Хүсэлт боловсруулах</strong><small>Линк ба харилцагч</small></span></a>}
        {(actor.isAdmin||actor.permissions.includes("CATALOG_MANAGE"))&&<a href="/admin/vehicles"><CircleDollarSign/><span><strong>Автомашины каталог</strong><small>Бэлэн, захиалгатай, зарагдсан</small></span></a>}
        {actor.isAdmin&&<a href="/admin/users"><UserCheck/><span><strong>Хэрэглэгч ба эрх</strong><small>Үйлдэл бүрийн хандалтыг удирдах</small></span></a>}
        {canOrders&&<a href="#orders"><Ship/><span><strong>Тээвэр хуваарилах</strong><small>Компани ба ажилтан</small></span></a>}
      </section>
    </DashboardShell>
  );
}
