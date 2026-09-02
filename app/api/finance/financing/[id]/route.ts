import { and, eq } from "drizzle-orm";
import { getFinanceUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { financingRequests, notifications, orders } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";

const statuses = new Set(["UNDER_REVIEW", "APPROVED", "DECLINED"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const finance = await getFinanceUser("FINANCE_DECIDE");
  if (!finance) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = String(body?.status ?? "");
  const decisionNote = String(body?.decisionNote ?? "").trim().slice(0, 600) || null;
  if (!statuses.has(status)) return Response.json({ error: "invalid status" }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ financing: financingRequests, order: orders }).from(financingRequests).innerJoin(orders, eq(financingRequests.orderId, orders.id)).where(eq(financingRequests.id, id)).limit(1);
  if (!row) return Response.json({ error: "financing request not found" }, { status: 404 });
  if (["APPROVED", "DECLINED"].includes(row.financing.status) && row.financing.status !== status) return Response.json({ error: "decision already finalized" }, { status: 409 });
  const now = new Date().toISOString();
  const finalDecision = ["APPROVED", "DECLINED"].includes(status);
  await db.batch([
    db.update(financingRequests).set({ status, approvedAmountMnt: status === "APPROVED" ? row.financing.requestedAmountMnt : 0, decisionNote, decidedBy: finalDecision ? finance.email.toLowerCase() : null, decidedAt: finalDecision ? now : null, updatedAt: now }).where(eq(financingRequests.id, id)),
    db.insert(notifications).values(notificationValues({ recipientType: "CUSTOMER", recipientEmail: row.financing.customerEmail, orderId: row.order.id, type: status === "APPROVED" ? "FINANCING_APPROVED" : status === "DECLINED" ? "FINANCING_DECLINED" : "FINANCING_REVIEW", title: status === "APPROVED" ? "Санхүүжилт зөвшөөрөгдлөө" : status === "DECLINED" ? "Санхүүжилтийн хүсэлт татгалзагдлаа" : "Санхүүжилтийн хүсэлт шалгагдаж байна", message: decisionNote ?? "Санхүүжилтийн хүсэлтийн төлөв шинэчлэгдлээ.", href: `/portal/vehicles/${encodeURIComponent(row.order.orderNo ?? row.order.id)}`, actorEmail: finance.email })),
    db.insert(notifications).values(notificationValues({ recipientType: "ADMIN", orderId: row.order.id, type: status === "APPROVED" ? "FINANCING_APPROVED" : status === "DECLINED" ? "FINANCING_DECLINED" : "FINANCING_REVIEW", title: status === "APPROVED" ? "ББСБ санхүүжилт зөвшөөрлөө" : status === "DECLINED" ? "ББСБ санхүүжилт татгалзлаа" : "ББСБ хүсэлтийг шалгаж байна", message: `${row.order.orderNo ?? row.order.id} захиалгын санхүүжилтийн төлөв шинэчлэгдлээ.`, href: `/admin/orders/${encodeURIComponent(row.order.id)}`, actorEmail: finance.email })),
  ]);
  return Response.json({ status });
}
