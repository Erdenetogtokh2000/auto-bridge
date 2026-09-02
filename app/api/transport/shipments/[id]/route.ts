import { eq } from "drizzle-orm";
import { getTransportUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, shipmentEvents, shipments } from "@/db/schema";
import { shipmentStatuses, shipmentStatusLabels } from "@/lib/shipment-status";
import { notificationValues } from "@/lib/notifications";

const validStatuses = new Set<string>(shipmentStatuses);
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max) || null;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getTransportUser("TRANSPORT_STATUS_UPDATE");
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);
  if (!shipment || (!actor.isAdmin && shipment.transportEmployeeEmail !== actor.email.toLowerCase())) {
    return Response.json({ error: "shipment not found" }, { status: 404 });
  }
  const [order]=await db.select().from(orders).where(eq(orders.id,shipment.orderId)).limit(1);
  if(!order)return Response.json({error:"order not found"},{status:404});
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });
  const status = String(body.status ?? "");
  const currentLocation = clean(body.currentLocation);
  const estimatedArrival = clean(body.estimatedArrival, 10);
  const containerNo = clean(body.containerNo, 80);
  const billOfLadingNo = clean(body.billOfLadingNo, 80);
  const note = clean(body.note, 500);
  if (!validStatuses.has(status) || !currentLocation || !note) return Response.json({ error: "required fields missing" }, { status: 400 });
  if (estimatedArrival && !/^\d{4}-\d{2}-\d{2}$/.test(estimatedArrival)) return Response.json({ error: "invalid arrival date" }, { status: 400 });
  const now = new Date().toISOString();
  await db.batch([
    db.update(shipments).set({ status, currentLocation, estimatedArrival, containerNo, billOfLadingNo, updatedBy: actor.email, completedAt: status === "DELIVERED" ? now : null, updatedAt: now }).where(eq(shipments.id, id)),
    db.insert(shipmentEvents).values({ id: `EVT-${crypto.randomUUID()}`, shipmentId: id, eventCode: status, location: currentLocation, note, eventAt: now, createdBy: actor.email }),
    db.insert(notifications).values(notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId:order.id,type:"SHIPMENT_UPDATED",title:"Тээврийн явц шинэчлэгдлээ",message:`${shipmentStatusLabels[status]??status} · ${currentLocation}. ${note}`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:actor.email})),
    db.insert(notifications).values(notificationValues({recipientType:"ADMIN",orderId:order.id,type:"SHIPMENT_UPDATED",title:"Тээврийн ажилтан явц шинэчиллээ",message:`${order.orderNo??order.id} · ${shipmentStatusLabels[status]??status} · ${currentLocation}`,href:`/admin/orders/${encodeURIComponent(order.id)}#shipping`,actorEmail:actor.email})),
  ]);
  return Response.json({ shipment: { ...shipment, status, currentLocation, estimatedArrival, containerNo, billOfLadingNo, updatedBy: actor.email, updatedAt: now } });
}
