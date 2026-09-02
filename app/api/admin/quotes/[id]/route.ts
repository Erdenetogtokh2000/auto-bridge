import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { quoteRequests } from "@/db/schema";
import { getQuotesManager as getAdminUser } from "@/app/chatgpt-auth";

const allowedStatuses = new Set(["NEW", "REVIEWING", "CONTACTED", "QUOTE_READY", "CUSTOMER_ACCEPTED", "CUSTOMER_DECLINED", "CONVERTED", "CLOSED"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = await request.json() as { status?: string; assignedTo?: string };
  const values: { status?: string; assignedTo?: string | null; updatedAt: string } = { updatedAt: new Date().toISOString() };

  if (payload.status !== undefined) {
    if (!allowedStatuses.has(payload.status)) return Response.json({ error: "invalid status" }, { status: 400 });
    values.status = payload.status;
  }
  if (payload.assignedTo !== undefined) values.assignedTo = payload.assignedTo.trim() || null;
  if (values.status === undefined && payload.assignedTo === undefined) return Response.json({ error: "nothing to update" }, { status: 400 });

  const [updated] = await getDb().update(quoteRequests).set(values).where(eq(quoteRequests.id, id)).returning();
  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ quote: updated });
}
