import { eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser, getCustomerUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, orders } from "@/db/schema";
import { getDocumentBucket } from "@/lib/document-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  const user = admin ?? await getCustomerUser("CUSTOMER_DOCUMENT_DOWNLOAD");
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const [row] = await getDb().select({ document: documents, customerEmail: orders.customerEmail })
    .from(documents).innerJoin(orders, eq(documents.orderId, orders.id)).where(eq(documents.id, id)).limit(1);
  if (!row || (!admin && (row.customerEmail.toLowerCase() !== user.email.toLowerCase() || row.document.status !== "VERIFIED"))) {
    return Response.json({ error: "document not found" }, { status: 404 });
  }
  if (!row.document.objectKey) return Response.json({ error: "file not found" }, { status: 404 });
  const object = await getDocumentBucket().get(row.document.objectKey);
  if (!object) return Response.json({ error: "file not found" }, { status: 404 });
  const asciiName = row.document.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return new Response(object.body, {
    headers: {
      "content-type": row.document.contentType ?? "application/octet-stream",
      "content-length": String(row.document.sizeBytes || object.size),
      "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.document.fileName)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
