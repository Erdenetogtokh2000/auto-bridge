import { and, eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders, payments, quoteEstimates } from "@/db/schema";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";
import { paymentSummary } from "@/lib/payment-summary";
import { notificationValues } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const admin=await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId, paymentId } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; dueDate?: unknown } | null;
  const status = String(body?.status ?? "");
  const hasStatus = body?.status !== undefined;
  const dueDateValue = body?.dueDate === null ? "" : String(body?.dueDate ?? "").trim();
  const dueDate = dueDateValue || null;
  if (hasStatus && status !== "PAID" && status !== "PENDING") {
    return Response.json({ error: "invalid status" }, { status: 400 });
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return Response.json({ error: "invalid due date" }, { status: 400 });
  }

  const db = getDb();
  const [[order], [payment], currentPayments] = await Promise.all([
    db.select().from(orders).where(eq(orders.id, orderId)).limit(1),
    db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.orderId, orderId))).limit(1),
    db.select().from(payments).where(eq(payments.orderId, orderId)),
  ]);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  if (!payment) return Response.json({ error: "payment not found" }, { status: 404 });
  const [estimate] = order.quoteRequestId
    ? await db.select().from(quoteEstimates).where(eq(quoteEstimates.quoteRequestId, order.quoteRequestId)).limit(1)
    : [];
  const terms = resolveOrderPaymentTerms(order, estimate);

  const now = new Date().toISOString();
  const nextStatus = hasStatus ? status : payment.status;
  const nextDueDate = body?.dueDate !== undefined ? dueDate : payment.dueDate;
  const nextPayments = currentPayments.map((item) => item.id === paymentId ? { ...item, status: nextStatus, dueDate: nextDueDate } : item);
  const summary = paymentSummary(terms.vehicleSubtotalMnt, terms.depositMnt, nextPayments);
  await db.batch([
    db.update(payments).set({ status: nextStatus, dueDate: nextDueDate, paidAt: nextStatus === "PAID" ? now : null, updatedAt: now })
      .where(and(eq(payments.id, paymentId), eq(payments.orderId, orderId))),
    db.update(orders).set({ vehicleSubtotalMnt: terms.vehicleSubtotalMnt, depositAmountMnt: terms.depositMnt, balanceAmountMnt: summary.balanceMnt, status: summary.orderStatus, updatedAt: now })
      .where(eq(orders.id, orderId)),
    db.update(documents).set({ status: nextStatus === "PAID" ? "VERIFIED" : "PENDING", verifiedAt: nextStatus === "PAID" ? now : null, updatedAt: now })
      .where(and(eq(documents.orderId, orderId), eq(documents.paymentId, paymentId), eq(documents.documentType, "PAYMENT_RECEIPT"))),
    ...(hasStatus ? [db.insert(notifications).values(notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:nextStatus==="PAID"?"PAYMENT_RECEIVED":"PAYMENT_PENDING",title:nextStatus==="PAID"?"Төлбөрийн төлөв шинэчлэгдлээ":"Төлбөр хүлээгдэж байна",message:`${payment.amount.toLocaleString("mn-MN")} ${payment.currency} төлбөрийн төлөв шинэчлэгдлээ.`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email}))] : []),
  ]);

  return Response.json({ payment: { ...payment, status: nextStatus, dueDate: nextDueDate, paidAt: nextStatus === "PAID" ? now : null, updatedAt: now }, summary });
}
