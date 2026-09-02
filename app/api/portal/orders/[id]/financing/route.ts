import { and, desc, eq } from "drizzle-orm";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { financingRequests, notifications, orders, payments, quoteEstimates, shipments, userProfiles } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCustomerPermission("/portal/financing", "CUSTOMER_FINANCING_REQUEST");
  const { id: orderId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });
  const requestedAmountMnt = Math.round(Number(body.requestedAmountMnt));
  const termMonths = Math.round(Number(body.termMonths));
  const requestType = String(body.requestType ?? "VEHICLE_BALANCE");
  const purpose = String(body.purpose ?? "").trim().slice(0, 500) || null;
  if (!new Set(["VEHICLE_BALANCE", "CUSTOMS_TAX"]).has(requestType) || !Number.isFinite(requestedAmountMnt) || requestedAmountMnt <= 0 || requestedAmountMnt > 1_000_000_000_000 || !Number.isFinite(termMonths) || termMonths < 3 || termMonths > 84) return Response.json({ error: "invalid financing fields" }, { status: 400 });
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerEmail, user.email.toLowerCase()))).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  const [profile] = await db.select({ financingEligible: userProfiles.financingEligible }).from(userProfiles).where(and(eq(userProfiles.email, user.email.toLowerCase()), eq(userProfiles.status, "ACTIVE"))).limit(1);
  if (!profile?.financingEligible) return Response.json({ error: "financing not eligible" }, { status: 403 });
  const [estimate] = order.quoteRequestId
    ? await db.select().from(quoteEstimates).where(eq(quoteEstimates.quoteRequestId, order.quoteRequestId)).limit(1)
    : [];
  const terms = resolveOrderPaymentTerms(order, estimate);
  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const depositPaid = paymentRows.filter((item) => item.paymentType === "DEPOSIT" && item.status === "PAID").reduce((sum, item) => sum + item.amountMnt, 0);
  if (depositPaid < terms.depositMnt) return Response.json({ error: "deposit required" }, { status: 409 });
  const vehiclePaid = paymentRows.filter((item) => item.paymentType === "VEHICLE" && item.status === "PAID").reduce((sum, item) => sum + item.amountMnt, 0);
  const vehicleBalanceMnt = Math.max(terms.balanceMnt - vehiclePaid, 0);
  let maximumAmount = vehicleBalanceMnt;
  if (requestType === "CUSTOMS_TAX") {
    const [shipment] = await db.select({ status: shipments.status }).from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
    if (!shipment || !["CUSTOMS", "ARRIVED", "DELIVERED"].includes(shipment.status)) return Response.json({ error: "customs financing is not available yet" }, { status: 409 });
    maximumAmount = paymentRows.filter((item) => item.paymentType === "CUSTOMS" && item.status === "PENDING").reduce((sum, item) => sum + item.amountMnt, 0);
  }
  if (maximumAmount <= 0 || requestedAmountMnt > maximumAmount) return Response.json({ error: "requested amount exceeds available balance" }, { status: 400 });
  const [active] = await db.select().from(financingRequests).where(and(eq(financingRequests.orderId, orderId), eq(financingRequests.customerEmail, user.email.toLowerCase()), eq(financingRequests.requestType, requestType))).orderBy(desc(financingRequests.createdAt)).limit(1);
  if (active && ["NEW", "UNDER_REVIEW", "APPROVED"].includes(active.status)) return Response.json({ error: "active financing request exists" }, { status: 409 });
  const now = new Date().toISOString();
  const financing = { id: `FIN-${crypto.randomUUID()}`, orderId, customerEmail: user.email.toLowerCase(), requestedAmountMnt, requestType, approvedAmountMnt: 0, termMonths, purpose, status: "NEW", createdAt: now, updatedAt: now };
  const typeLabel = requestType === "CUSTOMS_TAX" ? "гааль, татварын" : "автомашины үлдэгдэл төлбөрийн";
  await db.batch([
    db.update(orders).set({ vehicleSubtotalMnt: terms.vehicleSubtotalMnt, depositAmountMnt: terms.depositMnt, balanceAmountMnt: vehicleBalanceMnt, updatedAt: now }).where(eq(orders.id, orderId)),
    db.insert(financingRequests).values(financing),
    db.insert(notifications).values(notificationValues({ recipientType: "FINANCE", type: "FINANCING_REQUEST", title: "Шинэ санхүүжилтийн хүсэлт", message: `${order.orderNo ?? order.id} захиалгад ${typeLabel} ${requestedAmountMnt.toLocaleString("mn-MN")} ₮ санхүүжилт хүссэн байна.`, href: "/finance#requests", actorEmail: user.email })),
    db.insert(notifications).values(notificationValues({ recipientType: "ADMIN", orderId, type: "FINANCING_REQUEST", title: "Санхүүжилтийн хүсэлт илгээгдлээ", message: `${order.orderNo ?? order.id} захиалгын ${typeLabel} санхүүжилтийн хүсэлт ББСБ-д очлоо.`, href: `/admin/orders/${encodeURIComponent(orderId)}`, actorEmail: user.email })),
  ]);
  return Response.json({ financing }, { status: 201 });
}
