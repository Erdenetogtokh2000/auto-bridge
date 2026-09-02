import { and, eq } from "drizzle-orm";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, quoteRequests } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCustomerPermission("/portal/quotes", "CUSTOMER_QUOTE_DECIDE");
  const { id } = await params;
  const payload = await request.json() as { decision?: string };
  const decision = payload.decision === "ACCEPT" ? "CUSTOMER_ACCEPTED" : payload.decision === "DECLINE" ? "CUSTOMER_DECLINED" : null;
  if (!decision) return Response.json({ error: "invalid decision" }, { status: 400 });
  const db = getDb();
  const [quote] = await db.select().from(quoteRequests).where(and(eq(quoteRequests.id, id), eq(quoteRequests.requesterEmail, user.email.toLowerCase()))).limit(1);
  if (!quote) return Response.json({ error: "quote not found" }, { status: 404 });
  if (quote.status !== "QUOTE_READY") return Response.json({ error: "quote is not awaiting customer decision" }, { status: 409 });
  const now = new Date().toISOString();
  await db.batch([
    db.update(quoteRequests).set({ status: decision, updatedAt: now }).where(eq(quoteRequests.id, id)),
    db.insert(notifications).values(notificationValues({ recipientType: "ADMIN", type: decision === "CUSTOMER_ACCEPTED" ? "QUOTE_ACCEPTED" : "QUOTE_DECLINED", title: decision === "CUSTOMER_ACCEPTED" ? "Харилцагч үнийн саналыг зөвшөөрлөө" : "Харилцагч үнийн саналаас татгалзлаа", message: `${quote.requesterName ?? quote.requesterEmail} үнийн саналын шийдвэрээ илгээлээ.`, href: `/admin#quotes`, actorEmail: user.email })),
  ]);
  return Response.json({ status: decision });
}
