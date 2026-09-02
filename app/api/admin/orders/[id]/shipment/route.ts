import { eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, shipmentEvents, shipments } from "@/db/schema";
import { shipmentStatuses, shipmentStatusLabels } from "@/lib/shipment-status";
import { notificationValues } from "@/lib/notifications";

const validStatuses = new Set<string>(shipmentStatuses);
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max) || null;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });
  const status = String(body.status ?? "PREPARING");
  const originPort = clean(body.originPort);
  const destination = clean(body.destination) ?? "Улаанбаатар";
  const currentLocation = clean(body.currentLocation);
  const containerNo = clean(body.containerNo, 80);
  const billOfLadingNo = clean(body.billOfLadingNo, 80);
  const estimatedArrival = clean(body.estimatedArrival, 10);
  const transportEmployeeEmail = clean(body.transportEmployeeEmail, 180)?.toLowerCase() ?? null;
  const note = clean(body.note, 500);
  if (!validStatuses.has(status) || !originPort || !currentLocation || !transportEmployeeEmail || !transportEmployeeEmail.includes("@")) {
    return Response.json({ error: "required shipment fields missing" }, { status: 400 });
  }
  if (estimatedArrival && !/^\d{4}-\d{2}-\d{2}$/.test(estimatedArrival)) {
    return Response.json({ error: "invalid arrival date" }, { status: 400 });
  }

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  const [existing] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  const now = new Date().toISOString();
  const completedAt = status === "DELIVERED" ? now : null;
  const event = {
    id: `EVT-${crypto.randomUUID()}`,
    shipmentId: existing?.id ?? `SHP-${crypto.randomUUID()}`,
    eventCode: status,
    location: currentLocation,
    note: note ?? (existing ? "Админ тээврийн мэдээллийг шинэчилсэн." : "Тээврийн бүртгэл үүссэн."),
    eventAt: now,
    createdBy: admin.email,
  };
  const transportNotification = notificationValues({
    recipientType: "TRANSPORT",
    recipientEmail: transportEmployeeEmail,
    orderId,
    type: existing ? "SHIPMENT_UPDATED" : "SHIPMENT_ASSIGNED",
    title: existing ? "Тээврийн захиалга шинэчлэгдлээ" : "Танд шинэ тээвэр хуваарилагдлаа",
    message: `${order.orderNo ?? order.id} · ${shipmentStatusLabels[status] ?? status} · ${currentLocation}`,
    href: `/transport/shipments/${encodeURIComponent(event.shipmentId)}`,
    actorEmail: admin.email,
  });
  const customerNotification = notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:"SHIPMENT_UPDATED",title:existing?"Тээврийн явц шинэчлэгдлээ":"Тээврийн бүртгэл үүслээ",message:`${shipmentStatusLabels[status]??status} · ${currentLocation}`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email});

  if (existing) {
    await db.batch([
      db.update(shipments).set({ containerNo, billOfLadingNo, originPort, destination, currentLocation, status, estimatedArrival, transportEmployeeEmail, updatedBy: admin.email, completedAt, updatedAt: now }).where(eq(shipments.id, existing.id)),
      db.insert(shipmentEvents).values({ ...event, shipmentId: existing.id }),
      db.insert(notifications).values(customerNotification),
      db.insert(notifications).values(transportNotification),
    ]);
  } else {
    await db.batch([
      db.insert(shipments).values({ id: event.shipmentId, orderId, containerNo, billOfLadingNo, originPort, destination, currentLocation, status, estimatedArrival, transportEmployeeEmail, updatedBy: admin.email, completedAt, updatedAt: now }),
      db.insert(shipmentEvents).values(event),
      db.insert(notifications).values(customerNotification),
      db.insert(notifications).values(transportNotification),
    ]);
  }
  const [shipment] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  return Response.json({ shipment });
}
