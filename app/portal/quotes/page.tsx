import { and, desc, eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { CustomerQuoteHistory } from "@/app/components/customer-quote-history";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, quoteEstimates, quoteRequests } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CustomerQuoteHistoryPage() {
  const user = await requireCustomerPermission("/portal/quotes", "CUSTOMER_QUOTES_VIEW");
  const db = getDb();
  const rows = await db.select({ quote: quoteRequests, estimate: quoteEstimates }).from(quoteRequests).leftJoin(quoteEstimates, eq(quoteRequests.id, quoteEstimates.quoteRequestId)).where(eq(quoteRequests.requesterEmail, user.email.toLowerCase())).orderBy(desc(quoteRequests.createdAt));
  const quoteIds = rows.map(({ quote }) => quote.id);
  const [orderRows, unreadRows] = await Promise.all([
    quoteIds.length ? db.select({ quoteRequestId: orders.quoteRequestId, orderNo: orders.orderNo }).from(orders).where(inArray(orders.quoteRequestId, quoteIds)) : Promise.resolve([]),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.recipientType, "CUSTOMER"), eq(notifications.recipientEmail, user.email.toLowerCase()), eq(notifications.isRead, false))),
  ]);
  const items = rows.map(({ quote, estimate }) => ({ id: quote.id, sourceUrl: quote.sourceUrl, market: quote.market, status: quote.status, createdAt: quote.createdAt, vehicleName: estimate?.vehicleName ?? `${estimate?.vehicleMake ?? "Автомашин"} ${estimate?.vehicleModel ?? ""}`.trim(), totalMnt: estimate?.totalMnt ?? null, depositMnt: estimate?.depositMnt ?? null, orderNo: orderRows.find((order) => order.quoteRequestId === quote.id)?.orderNo ?? null }));
  return <DashboardShell role="customer" title="Үнийн саналын түүх" subtitle="Таны илгээсэн үнийн хүсэлт, саналын төлөв болон захиалга болсон явцыг хянах хэсэг." userName={user.displayName} userCode={user.email} unreadCount={unreadRows.length} notificationHref="/portal/notifications" rolePermissions={user.permissions}><CustomerQuoteHistory items={items} /></DashboardShell>;
}
