import { eq } from "drizzle-orm";
import { getOrdersManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders } from "@/db/schema";
import { getDocumentBucket, safeDocumentName } from "@/lib/document-storage";
import { notificationValues } from "@/lib/notifications";

const documentTypes = new Set(["INVOICE", "EXPORT_CERTIFICATE", "BILL_OF_LADING", "CUSTOMS", "VEHICLE_REGISTRATION", "CONTRACT", "OTHER", "PAYMENT_RECEIPT"]);
const statuses = new Set(["PENDING", "VERIFIED"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "doc", "docx"]);
const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId } = await params;
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const documentType = String(formData?.get("documentType") ?? "");
  const status = String(formData?.get("status") ?? "PENDING");
  if (!(file instanceof File) || !documentTypes.has(documentType) || !statuses.has(status)) {
    return Response.json({ error: "invalid document fields" }, { status: 400 });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension) || file.size <= 0 || file.size > maxFileSize) {
    return Response.json({ error: "unsupported file" }, { status: 400 });
  }

  const id = `DOC-${crypto.randomUUID()}`;
  const fileName = safeDocumentName(file.name);
  const objectKey = `documents/${orderId}/${id}/${fileName}`;
  const now = new Date().toISOString();
  const bucket = getDocumentBucket();
  await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  try {
    const documentValue={
      id,
      orderId,
      paymentId: null,
      documentType,
      fileName,
      objectKey,
      contentType: file.type,
      sizeBytes: file.size,
      status,
      uploadedBy: admin.email,
      verifiedAt: status === "VERIFIED" ? now : null,
      updatedAt: now,
    };
    if(status==="VERIFIED") {
      const notification = notificationValues({recipientType:"CUSTOMER",recipientEmail:order.customerEmail,orderId,type:"DOCUMENT_READY",title:"Шинэ бичиг баримт бэлэн боллоо",message:`${fileName} баримтыг татаж авах боломжтой боллоо.`,href:`/portal/vehicles/${encodeURIComponent(order.orderNo??order.id)}`,actorEmail:admin.email});
      await db.batch([db.insert(documents).values(documentValue), db.insert(notifications).values(notification)]);
    } else await db.insert(documents).values(documentValue);
  } catch (error) {
    await bucket.delete(objectKey);
    throw error;
  }

  const [created] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return Response.json({ document: created }, { status: 201 });
}
