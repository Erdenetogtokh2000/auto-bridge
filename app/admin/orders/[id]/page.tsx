import { and, desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { PaymentManager } from "@/app/components/payment-manager";
import { DocumentManager } from "@/app/components/document-manager";
import { ShipmentManager } from "@/app/components/shipment-manager";
import { NotificationComposer } from "@/app/components/notification-composer";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, orders, payments, shipments, userProfiles, vehicles } from "@/db/schema";
import { ArrowLeft, CarFront, ExternalLink, LockKeyhole } from "lucide-react";
import { createOverduePaymentReminders } from "@/lib/payment-reminders";
import { orderStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOrderContent id={id}/>;
}

async function AdminOrderContent({ id }: { id: string }) {
  const user = await requireAdminPermission(`/admin/orders/${encodeURIComponent(id)}`, "ORDERS_MANAGE");
  const db = getDb();
  const [row] = await db.select({ order: orders, vehicle: vehicles }).from(orders)
    .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).where(eq(orders.id, id)).limit(1);
  if (!row) return <DashboardShell role="admin" title="Захиалга олдсонгүй" subtitle="Захиалгын дугаар буруу эсвэл устсан байна." userName={user.displayName} userCode={user.email} adminPermissions={user.permissions} isSystemAdmin={user.isAdmin}><div className="portal-empty"><LockKeyhole/><h3>Захиалгын мэдээлэл олдсонгүй</h3><a href="/admin"><ArrowLeft/>Админ самбар руу буцах</a></div></DashboardShell>;
  const [paymentRows, documentRows, shipmentRows, transportStaff] = await Promise.all([
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
    db.select({ id: documents.id, paymentId: documents.paymentId, documentType: documents.documentType, fileName: documents.fileName, contentType: documents.contentType, sizeBytes: documents.sizeBytes, status: documents.status, uploadedBy: documents.uploadedBy, verifiedAt: documents.verifiedAt, createdAt: documents.createdAt })
      .from(documents).where(eq(documents.orderId, id)).orderBy(desc(documents.createdAt)),
    db.select().from(shipments).where(eq(shipments.orderId,id)).limit(1),
    db.select({ email: userProfiles.email, fullName: userProfiles.fullName })
      .from(userProfiles)
      .where(and(eq(userProfiles.role, "TRANSPORT"), eq(userProfiles.status, "ACTIVE")))
      .orderBy(userProfiles.fullName),
  ]);
  const { order, vehicle } = row;
  await createOverduePaymentReminders(db, order.customerEmail);

  return <DashboardShell role="admin" title="Захиалгын удирдлага" subtitle={`${order.orderNo ?? order.id} захиалгын төлбөр, бичиг баримт, тээврийн явц.`} userName={user.displayName} userCode={user.email} adminPermissions={user.permissions} isSystemAdmin={user.isAdmin}>
    <a className="back-link" href="/admin"><ArrowLeft size={14}/> Удирдлагын самбар</a>
    <section className="admin-order-hero">
      <div className="admin-order-icon"><CarFront/></div>
      <div><span>{order.orderNo ?? order.id} · {vehicle.sourceMarket}</span><h2>{vehicle.make} {vehicle.model}</h2><p>{vehicle.productionYear} · {vehicle.mileageKm?.toLocaleString("mn-MN") ?? 0} км · {order.customerName ?? order.customerEmail}</p>{vehicle.listingUrl && <a href={vehicle.listingUrl} target="_blank" rel="noreferrer">Эх зарын холбоос <ExternalLink/></a>}</div>
      <strong>{orderStatusLabel(order.status)}</strong>
    </section>
    <PaymentManager orderId={order.id} totalAmountMnt={order.totalAmountMnt} payments={paymentRows.map((item) => ({ ...item, receiptDocumentId: documentRows.find((document) => document.paymentId === item.id)?.id ?? null }))}/>
    <DocumentManager orderId={order.id} documents={documentRows}/>
    <ShipmentManager orderId={order.id} shipment={shipmentRows[0]??null} transportStaff={transportStaff}/>
    <NotificationComposer orderId={order.id} customerName={order.customerName ?? order.customerEmail}/>
  </DashboardShell>;
}
