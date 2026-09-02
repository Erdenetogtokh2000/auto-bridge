import { eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, payments, quoteEstimates } from "@/db/schema";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";
import { paymentSummary } from "@/lib/payment-summary";
import { notificationValues } from "@/lib/notifications";

const paymentTypes = new Set(["DEPOSIT", "VEHICLE", "SHIPPING", "CUSTOMS", "OTHER"]);
const currencies = new Set(["MNT", "KRW", "USD"]);
const statuses = new Set(["PENDING", "PAID"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin=await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });

  const paymentType = String(body.paymentType ?? "");
  const currency = String(body.currency ?? "");
  const status = String(body.status ?? "");
  const amount = Number(body.amount);
  const amountMnt = currency === "MNT" ? Math.round(amount) : Math.round(Number(body.amountMnt));
  const dueDateValue = String(body.dueDate ?? "").trim();
  const dueDate = dueDateValue || null;
  const referenceNo = String(body.referenceNo ?? "").trim().slice(0, 100) || null;
  const note = String(body.note ?? "").trim().slice(0, 500) || null;

  if (!paymentTypes.has(paymentType) || !currencies.has(currency) || !statuses.has(status)) {
    return Response.json({ error: "invalid payment fields" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(amountMnt) || amountMnt <= 0) {
    return Response.json({ error: "amount must be positive" }, { status: 400 });
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return Response.json({ error: "invalid due date" }, { status: 400 });
  }

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  const [estimate] = order.quoteRequestId
    ? await db.select().from(quoteEstimates).where(eq(quoteEstimates.quoteRequestId, order.quoteRequestId)).limit(1)
    : [];
  const terms = resolveOrderPaymentTerms(order, estimate);
  const currentPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (paymentType === "DEPOSIT" && amountMnt !== terms.depositMnt) return Response.json({ error: "deposit must equal required 30 percent" }, { status: 400 });
  if (paymentType === "DEPOSIT" && currentPayments.some((item) => item.paymentType === "DEPOSIT")) return Response.json({ error: "deposit payment already exists" }, { status: 409 });
  const now = new Date().toISOString();
  const payment = {
    id: `PAY-${crypto.randomUUID()}`,
    orderId,
    paymentType,
    currency,
    amount,
    amountMnt,
    status,
    dueDate,
    referenceNo,
    note,
    paidAt: status === "PAID" ? now : null,
    updatedAt: now,
  };
  const summary = paymentSummary(terms.vehicleSubtotalMnt, terms.depositMnt, [...currentPayments, payment]);
  const notification = notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:status==="PAID"?"PAYMENT_RECEIVED":"PAYMENT_PENDING",title:status==="PAID"?"Төлбөр бүртгэгдлээ":"Төлбөр хүлээгдэж байна",message:`${amount.toLocaleString("mn-MN")} ${currency} төлбөр ${status==="PAID"?"амжилттай бүртгэгдлээ":"хүлээгдэж буй төлөвт нэмэгдлээ"}.`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email});

  await db.batch([
    db.insert(payments).values(payment),
    db.update(orders).set({
      vehicleSubtotalMnt: terms.vehicleSubtotalMnt,
      depositAmountMnt: terms.depositMnt,
      balanceAmountMnt: summary.balanceMnt,
      status: summary.orderStatus,
      updatedAt: now,
    }).where(eq(orders.id, orderId)),
    db.insert(notifications).values(notification),
  ]);

  return Response.json({ payment, summary }, { status: 201 });
}
