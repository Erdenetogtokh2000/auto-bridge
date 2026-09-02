import { and, desc, eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { Progress } from "@/components/ui/progress";
import { getDb } from "@/db";
import { documents, notifications, orders, payments, quoteEstimates, shipmentEvents, shipments, vehicles } from "@/db/schema";
import { orderProgress, orderStatusLabel } from "@/lib/order-status";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";
import { createOverduePaymentReminders } from "@/lib/payment-reminders";
import { AlertCircle, ArrowRight, CalendarDays, CarFront, CheckCircle2, CircleDollarSign, Clock3, FileText, MapPin, Ship, WalletCards } from "lucide-react";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const vehicleImage = (vehicle: typeof vehicles.$inferSelect) => vehicle.imageObjectKey ? `/api/vehicle-images/${encodeURIComponent(vehicle.id)}` : vehicle.imageUrl;

export default async function CustomerPortal() {
  const user = await requireCustomerPermission("/portal", "CUSTOMER_DASHBOARD_VIEW");
  const db = getDb();
  const orderRows = await db.select({ order: orders, vehicle: vehicles, shipment: shipments, estimate: quoteEstimates })
    .from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
    .leftJoin(shipments, eq(orders.id, shipments.orderId))
    .leftJoin(quoteEstimates, eq(orders.quoteRequestId, quoteEstimates.quoteRequestId))
    .where(eq(orders.customerEmail, user.email.toLowerCase())).orderBy(desc(orders.createdAt));
  const orderIds = orderRows.map(row => row.order.id);
  await createOverduePaymentReminders(db, user.email);
  const shipmentIds = orderRows.flatMap(row => row.shipment ? [row.shipment.id] : []);
  const [documentRows, eventRows, unreadRows, paymentRows] = await Promise.all([
    orderIds.length ? db.select().from(documents).where(inArray(documents.orderId, orderIds)).orderBy(desc(documents.createdAt)) : Promise.resolve([]),
    shipmentIds.length ? db.select().from(shipmentEvents).where(inArray(shipmentEvents.shipmentId, shipmentIds)).orderBy(desc(shipmentEvents.eventAt)).limit(5) : Promise.resolve([]),
    db.select({id:notifications.id}).from(notifications).where(and(eq(notifications.recipientType,"CUSTOMER"),eq(notifications.recipientEmail,user.email.toLowerCase()),eq(notifications.isRead,false))),
    orderIds.length ? db.select().from(payments).where(inArray(payments.orderId, orderIds)) : Promise.resolve([]),
  ]);
  const vehicleBalance = (row: typeof orderRows[number]) => {
    const terms = resolveOrderPaymentTerms(row.order, row.estimate);
    const paid = paymentRows.filter(item => item.orderId === row.order.id && item.paymentType === "VEHICLE" && item.status === "PAID").reduce((sum, item) => sum + item.amountMnt, 0);
    return Math.max(terms.balanceMnt - paid, 0);
  };
  const totalBalance = orderRows.reduce((sum,row)=>sum+vehicleBalance(row),0);
  const inTransit = orderRows.filter(row=>row.shipment && !["DELIVERED","ARRIVED"].includes(row.shipment.status)).length;
  const displayName = user.fullName ?? orderRows[0]?.order.customerName ?? user.email;

  return <DashboardShell role="customer" title="Миний хяналтын самбар" subtitle="Таны автомашин, төлбөр болон тээврийн хамгийн сүүлийн мэдээлэл." userName={displayName} userCode={user.email} unreadCount={unreadRows.length} notificationHref="/portal/notifications" rolePermissions={user.permissions}>
    <section className="stat-grid">
      <article className="stat-card"><div className="stat-icon blue"><CarFront size={20}/></div><span>Нийт автомашин</span><strong>{orderRows.length}</strong><small>Таны бүртгэлтэй захиалга</small></article>
      <article className="stat-card"><div className="stat-icon green"><Ship size={20}/></div><span>Тээвэрт байгаа</span><strong>{inTransit}</strong><small>Идэвхтэй тээвэр</small></article>
      <article className="stat-card"><div className="stat-icon amber"><WalletCards size={20}/></div><span>Машины 70%-ийн үлдэгдэл</span><strong>{money.format(totalBalance)} ₮</strong><small>{orderRows.filter(row=>vehicleBalance(row)>0).length} захиалга</small></article>
      <article className="stat-card"><div className="stat-icon violet"><FileText size={20}/></div><span>Бичиг баримт</span><strong>{documentRows.length}</strong><small>Татаж авах файлууд</small></article>
    </section>

    {totalBalance > 0 && <section className="action-banner"><div className="action-icon"><AlertCircle size={22}/></div><div><strong>Төлбөрийн үлдэгдэлтэй байна</strong><p>Нийт {money.format(totalBalance)} ₮ төлбөр хүлээгдэж байна.</p></div><a href="#payments">Төлбөр харах <ArrowRight size={15}/></a></section>}

    <section className="dashboard-section" id="orders">
      <div className="dashboard-section-heading"><div><span>АВТОМАШИН</span><h2>Миний захиалгууд</h2></div><a href="/#quote">Шинэ машин захиалах <ArrowRight size={15}/></a></div>
      {orderRows.length ? <div className="order-list">{orderRows.map((row)=>{ const {order,vehicle,shipment}=row;
        const progress=orderProgress(order.status,shipment?.status); const label=orderStatusLabel(order.status,shipment?.status);
        const image = vehicleImage(vehicle);
        return <article className="order-card" key={order.id}>
          <div className={`order-car-visual ${image ? "has-image" : ""}`}>{image ? <img src={image} alt={`${vehicle.make} ${vehicle.model}`} /> : <CarFront size={72} strokeWidth={.9}/>}<span>{order.orderNo ?? order.id}</span></div>
          <div className="order-main"><div className="order-title-row"><div><small>{order.orderNo ?? order.id}</small><h3>{vehicle.productionYear} {vehicle.make} {vehicle.model}</h3><p>{vehicle.fuelType ?? "Түлш тодорхойгүй"} · {money.format(vehicle.mileageKm ?? 0)} км · {vehicle.sourceMarket}</p></div><span className="status-chip shipping">{label}</span></div>
            <div className="progress-row"><div><span>Захиалгын гүйцэтгэл</span><strong>{progress}%</strong></div><Progress value={progress}/></div>
            <div className="order-meta"><span><MapPin size={14}/><small>Одоогийн байршил</small><strong>{shipment?.currentLocation ?? "Бэлтгэл шат"}</strong></span><span><CalendarDays size={14}/><small>Тооцоолсон ирэх өдөр</small><strong>{shipment?.estimatedArrival ?? "Тодорхойгүй"}</strong></span><span><CircleDollarSign size={14}/><small>Машины 70%-ийн үлдэгдэл</small><strong>{money.format(vehicleBalance(row))} ₮</strong></span></div>
          </div><a className="order-detail-link" href={`/portal/vehicles/${encodeURIComponent(order.orderNo ?? order.id)}`}>Дэлгэрэнгүй <ArrowRight size={15}/></a>
        </article>})}</div> : <div className="portal-empty"><CarFront/><h3>Таны нэр дээр захиалга хараахан алга</h3><p>Үнийн хүсэлтэд өгсөн и-мэйл болон ChatGPT бүртгэлийн и-мэйл ижил байх шаардлагатай.</p><a href="/#quote">Үнийн хүсэлт илгээх <ArrowRight/></a></div>}
    </section>

    <div className="dashboard-two-col">
      <section className="dashboard-panel" id="payments"><div className="panel-heading"><div><span>САНХҮҮ</span><h2>Төлбөрийн мэдээлэл</h2></div><WalletCards size={20}/></div><div className="payment-total"><span>Машины 70%-ийн нийт үлдэгдэл</span><strong>{money.format(totalBalance)} ₮</strong><small>Гааль, татварын төлбөр тусдаа тооцогдоно</small></div>{orderRows.map(row=><div className="payment-line" key={row.order.id}><span><i className="dot blue"/>{row.order.orderNo ?? row.order.id}</span><strong>{money.format(vehicleBalance(row))} ₮</strong></div>)}</section>
      <section className="dashboard-panel" id="shipping"><div className="panel-heading"><div><span>ТЭЭВЭР</span><h2>Сүүлийн шинэчлэл</h2></div><Ship size={20}/></div>{eventRows.length ? <div className="mini-timeline">{eventRows.map((event,index)=><div className={index===0?"active":"done"} key={event.id}><i>{index===0?<Clock3 size={13}/>:<CheckCircle2 size={13}/>}</i><span><strong>{event.note ?? event.eventCode}</strong><small>{event.location ?? "Байршилгүй"} · {event.eventAt}</small></span></div>)}</div> : <div className="panel-empty">Тээврийн шинэчлэл хараахан бүртгэгдээгүй.</div>}</section>
    </div>
  </DashboardShell>;
}
