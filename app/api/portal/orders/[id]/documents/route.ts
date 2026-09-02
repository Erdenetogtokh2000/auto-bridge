import { and, eq } from "drizzle-orm";
import { getCustomerUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders } from "@/db/schema";
import { getDocumentBucket, safeDocumentName } from "@/lib/document-storage";
import { notificationValues } from "@/lib/notifications";

const customerDocumentTypes = new Set(["CUSTOMS", "VEHICLE_REGISTRATION", "CONTRACT", "OTHER"]);
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
  const user = await getCustomerUser("CUSTOMER_DOCUMENT_UPLOAD");
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id: orderId } = await params;
  const db = getDb();
  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerEmail, user.email.toLowerCase()))).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const documentType = String(formData?.get("documentType") ?? "");
  if (!(file instanceof File) || !customerDocumentTypes.has(documentType)) {
    return Response.json({ error: "invalid document fields" }, { status: 400 });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension) || file.size <= 0 || file.size > maxFileSize) {
    return Response.json({ error: "unsupported file" }, { status: 400 });
  }

  const documentId = `DOC-${crypto.randomUUID()}`;
  const fileName = safeDocumentName(file.name);
  const objectKey = `documents/${orderId}/${documentId}/${fileName}`;
  const now = new Date().toISOString();
  const bucket = getDocumentBucket();
  await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  try {
    await db.batch([
      db.insert(documents).values({
        id: documentId,
        orderId,
        documentType,
        fileName,
        objectKey,
        contentType: file.type,
        sizeBytes: file.size,
        status: "PENDING",
        uploadedBy: user.email,
        verifiedAt: null,
        updatedAt: now,
      }),
      db.insert(notifications).values(notificationValues({
        recipientType: "ADMIN",
        orderId,
        type: "DOCUMENT_SUBMITTED",
        title: "Хэрэглэгч шинэ баримт илгээлээ",
        message: `${order.orderNo ?? order.id} захиалгад ${fileName} баримт илгээгдлээ. Шалгана уу.`,
        href: `/admin/orders/${encodeURIComponent(orderId)}`,
        actorEmail: user.email,
      })),
    ]);
  } catch (error) {
    await bucket.delete(objectKey);
    throw error;
  }

  const [created] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  return Response.json({ document: created }, { status: 201 });
}
