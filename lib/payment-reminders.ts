import { and, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, orders, payments } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";

/** Create at most one in-app overdue reminder per payment, recipient and day. */
export async function createOverduePaymentReminders(db: ReturnType<typeof getDb>, customerEmail?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = `${today} 00:00:00`;
  const rows = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(and(eq(payments.status, "PENDING"), lt(payments.dueDate, today), ...(customerEmail ? [eq(orders.customerEmail, customerEmail.toLowerCase())] : [])));

  const inserts = [];
  for (const { payment, order } of rows) {
    const customer = order.customerEmail.toLowerCase();
    const [customerReminder, adminReminder] = await Promise.all([
      db.select({ id: notifications.id }).from(notifications).where(and(
        eq(notifications.recipientType, "CUSTOMER"), eq(notifications.recipientEmail, customer),
        eq(notifications.orderId, order.id), eq(notifications.type, "PAYMENT_OVERDUE"), gte(notifications.createdAt, dayStart),
      )).limit(1),
      db.select({ id: notifications.id }).from(notifications).where(and(
        eq(notifications.recipientType, "ADMIN"), eq(notifications.orderId, order.id),
        eq(notifications.type, "PAYMENT_OVERDUE"), gte(notifications.createdAt, dayStart),
      )).limit(1),
    ]);
    if (!customerReminder.length) {
      const notification = notificationValues({
        recipientType: "CUSTOMER", recipientEmail: customer, orderId: order.id, type: "PAYMENT_OVERDUE",
        title: "Төлбөрийн хугацаа хэтэрлээ",
        message: `${payment.paymentType} төлбөрийн ${payment.dueDate} хугацаа хэтэрсэн байна. Үлдэгдэл: ${payment.amountMnt.toLocaleString("mn-MN")} ₮.`,
        href: `/portal/vehicles/${encodeURIComponent(order.orderNo ?? order.id)}`, actorEmail: "SYSTEM",
      });
      inserts.push(db.insert(notifications).values(notification));
    }
    if (!adminReminder.length) inserts.push(db.insert(notifications).values(notificationValues({
      recipientType: "ADMIN", orderId: order.id, type: "PAYMENT_OVERDUE",
      title: "Хугацаа хэтэрсэн төлбөр",
      message: `${order.orderNo ?? order.id} · ${payment.paymentType} төлбөрийн ${payment.dueDate} хугацаа хэтэрсэн байна.`,
      href: `/admin/orders/${encodeURIComponent(order.id)}#payments`, actorEmail: "SYSTEM",
    })));
  }
  if (inserts.length) await db.batch(inserts as Parameters<typeof db.batch>[0]);
}
