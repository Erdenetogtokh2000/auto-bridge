import { and, eq } from "drizzle-orm";
import { getCustomerUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { documents, notifications, orders, payments, quoteEstimates } from "@/db/schema";
import { getDocumentBucket, safeDocumentName } from "@/lib/document-storage";
import { notificationValues } from "@/lib/notifications";
import { resolveOrderPaymentTerms } from "@/lib/order-payment-terms";

const paymentTypes = new Set(["DEPOSIT", "VEHICLE", "SHIPPING", "CUSTOMS", "OTHER"]);
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "doc", "docx"]);
const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCustomerUser("CUSTOMER_PAYMENT_RECEIPT_UPLOAD");
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id: orderId } = await params;
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerEmail, user.email.toLowerCase()))).limit(1);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  const [estimate] = order.quoteRequestId
    ? await db.select().from(quoteEstimates).where(eq(quoteEstimates.quoteRequestId, order.quoteRequestId)).limit(1)
    : [];
  const terms = resolveOrderPaymentTerms(order, estimate);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const paymentType = String(formData?.get("paymentType") ?? "");
  const amountMnt = Math.round(Number(formData?.get("amountMnt")));
  const referenceNo = String(formData?.get("referenceNo") ?? "").trim().slice(0, 100) || null;
  if (!(file instanceof File) || !paymentTypes.has(paymentType) || !Number.isFinite(amountMnt) || amountMnt <= 0) {
    return Response.json({ error: "invalid payment fields" }, { status: 400 });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension) || file.size <= 0 || file.size > maxFileSize) {
    return Response.json({ error: "unsupported file" }, { status: 400 });
  }

  if (paymentType === "DEPOSIT" && amountMnt !== terms.depositMnt) {
    return Response.json({ error: "deposit must equal required amount" }, { status: 400 });
  }
  const [existingDeposit] = paymentType === "DEPOSIT"
    ? await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.paymentType, "DEPOSIT"), eq(payments.status, "PENDING"))).limit(1)
    : [];
  if (paymentType === "DEPOSIT" && !existingDeposit) {
    const [paidDeposit] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.paymentType, "DEPOSIT"), eq(payments.status, "PAID"))).limit(1);
    if (paidDeposit) return Response.json({ error: "deposit already paid" }, { status: 409 });
  }
  const paymentId = existingDeposit?.id ?? `PAY-${crypto.randomUUID()}`;
  const documentId = `DOC-${crypto.randomUUID()}`;
  const fileName = safeDocumentName(file.name);
  const objectKey = `documents/${orderId}/${documentId}/${fileName}`;
  const now = new Date().toISOString();
  const bucket = getDocumentBucket();
  await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  try {
    await db.batch([
      existingDeposit
        ? db.update(payments).set({ amount: amountMnt, amountMnt, referenceNo, note: `Хэрэглэгчийн төлбөрийн баримт: ${fileName}`, status: "PENDING", paidAt: null, updatedAt: now }).where(eq(payments.id, paymentId))
        : db.insert(payments).values({
          id: paymentId, orderId, paymentType, currency: "MNT", amount: amountMnt, amountMnt,
          status: "PENDING", referenceNo, note: `Хэрэглэгчийн төлбөрийн баримт: ${fileName}`, paidAt: null, updatedAt: now,
        }),
      db.insert(documents).values({
        id: documentId, orderId, paymentId, documentType: "PAYMENT_RECEIPT", fileName, objectKey, contentType: file.type,
        sizeBytes: file.size, status: "PENDING", uploadedBy: user.email, verifiedAt: null, updatedAt: now,
      }),
      db.insert(notifications).values(notificationValues({
        recipientType: "ADMIN", orderId, type: "PAYMENT_RECEIPT_SUBMITTED",
        title: "Хэрэглэгч төлбөрийн баримт илгээлээ",
        message: `${order.orderNo ?? order.id} захиалгад ${amountMnt.toLocaleString("mn-MN")} ₮-ийн төлбөрийн баримт ирлээ.`,
        href: `/admin/orders/${encodeURIComponent(orderId)}`, actorEmail: user.email,
      })),
    ]);
  } catch (error) {
    await bucket.delete(objectKey);
    throw error;
  }
  return Response.json({ paymentId, documentId, status: "PENDING" }, { status: 201 });
}
