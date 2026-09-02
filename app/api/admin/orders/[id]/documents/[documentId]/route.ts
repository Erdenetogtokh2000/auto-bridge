import { and, eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders } from "@/db/schema";
import { getDocumentBucket } from "@/lib/document-storage";
import { notificationValues } from "@/lib/notifications";

async function findDocument(orderId: string, documentId: string) {
  const [document] = await getDb().select().from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.orderId, orderId))).limit(1);
  return document;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const admin=await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId, documentId } = await params;
  const document = await findDocument(orderId, documentId);
  if (!document) return Response.json({ error: "document not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = String(body?.status ?? "");
  if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
    return Response.json({ error: "invalid status" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const db=getDb(); const [order]=await db.select().from(orders).where(eq(orders.id,orderId)).limit(1);
  if(!order)return Response.json({error:"order not found"},{status:404});
  await db.batch([
    db.update(documents).set({ status, verifiedAt: status === "VERIFIED" ? now : null, updatedAt: now }).where(and(eq(documents.id, documentId), eq(documents.orderId, orderId))),
    db.insert(notifications).values(notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:status==="VERIFIED"?"DOCUMENT_READY":"DOCUMENT_REJECTED",title:status==="VERIFIED"?"Бичиг баримт баталгаажлаа":"Бичиг баримт засвар шаардлагатай",message:`${document.fileName} баримтын төлөв шинэчлэгдлээ.`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email})),
  ]);
  return Response.json({ document: { ...document, status, verifiedAt: status === "VERIFIED" ? now : null, updatedAt: now } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  if (!await getAdminUser()) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId, documentId } = await params;
  const document = await findDocument(orderId, documentId);
  if (!document) return Response.json({ error: "document not found" }, { status: 404 });
  await getDb().delete(documents).where(and(eq(documents.id, documentId), eq(documents.orderId, orderId)));
  if (document.objectKey) {
    try { await getDocumentBucket().delete(document.objectKey); } catch { /* metadata is already safely removed */ }
  }
  return Response.json({ deleted: true });
}
