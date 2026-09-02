import { eq } from "drizzle-orm";
import { getCustomerUser, getFinanceUser, getNotificationsManager, getTransportUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!notification) return Response.json({ error: "notification not found" }, { status: 404 });

  const admin = notification.recipientType === "ADMIN" ? await getNotificationsManager() : null;
  const finance = notification.recipientType === "FINANCE" ? await getFinanceUser("FINANCE_NOTIFICATIONS_VIEW") : null;
  const transport = notification.recipientType === "TRANSPORT" ? await getTransportUser("TRANSPORT_NOTIFICATIONS_VIEW") : null;
  const customer = notification.recipientType === "CUSTOMER" ? await getCustomerUser("CUSTOMER_NOTIFICATIONS_VIEW") : null;
  const actor = admin ?? finance ?? transport ?? customer;
  const sharedRecipient = notification.recipientType === "ADMIN" || notification.recipientType === "FINANCE";
  if (!actor || (!sharedRecipient && notification.recipientEmail !== actor.email.toLowerCase())) {
    return Response.json({ error: "notification not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await db.update(notifications).set({ isRead: true, readAt: now }).where(eq(notifications.id, id));
  return Response.json({ notification: { ...notification, isRead: true, readAt: now } });
}
