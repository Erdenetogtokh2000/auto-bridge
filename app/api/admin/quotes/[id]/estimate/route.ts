import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, quoteEstimates, quoteRequests } from "@/db/schema";
import { calculateQuote, type QuoteCalculationInput } from "@/lib/quote-calculation";
import { notificationValues } from "@/lib/notifications";
import { getQuotesManager as getAdminUser } from "@/app/chatgpt-auth";

const numericFields: (keyof QuoteCalculationInput)[] = ["vehiclePriceKrw", "purchaseFeeKrw", "inlandTransportKrw", "oceanFreightUsd", "krwMntRate", "usdMntRate", "customsMnt", "exciseMnt", "vatMnt", "otherCostsMnt", "depositMnt"];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = await request.json() as Record<string, unknown>;
  const numbers = Object.fromEntries(numericFields.map(field => [field, Number(payload[field] ?? 0)])) as QuoteCalculationInput;
  if (Object.values(numbers).some(value => !Number.isFinite(value) || value < 0 || value > 1_000_000_000_000_000)) return Response.json({ error: "invalid numeric value" }, { status: 400 });
  const [quote] = await getDb().select({ id: quoteRequests.id }).from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1);
  if (!quote) return Response.json({ error: "quote request not found" }, { status: 404 });

  const totals = calculateQuote(numbers);
  if (!Number.isSafeInteger(totals.totalMnt)) return Response.json({ error: "calculated total is too large" }, { status: 400 });
  const now = new Date().toISOString();
  const requesterEmail = String(payload.requesterEmail ?? "").trim().toLowerCase();
  const vehicleMake = String(payload.vehicleMake ?? "").trim();
  const vehicleModel = String(payload.vehicleModel ?? "").trim();
  const productionYear = Number(payload.productionYear ?? 0);
  const mileageKm = Number(payload.mileageKm ?? 0);
  const fuelType = String(payload.fuelType ?? "").trim();
  const engineCapacityCc = Math.max(Number(payload.engineCapacityCc ?? 0) || 0, 0);
  if (payload.markReady === true && (!vehicleMake || !vehicleModel || productionYear < 1980 || productionYear > 2100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail))) return Response.json({ error: "vehicle and customer details required" }, { status: 400 });
  const values = {
    vehicleName: String(payload.vehicleName ?? "").trim() || null,
    vehicleMake: vehicleMake || null, vehicleModel: vehicleModel || null,
    productionYear: productionYear || null, mileageKm: Math.max(mileageKm || 0, 0), fuelType: fuelType || null, engineCapacityCc: Math.round(engineCapacityCc),
    ...numbers, exciseMnt: Math.round(numbers.exciseMnt ?? 0), depositMnt: totals.depositMnt,
    totalMnt: totals.totalMnt,
    notes: String(payload.notes ?? "").trim() || null,
    updatedAt: now,
  };
  const [saved] = await getDb().insert(quoteEstimates).values({ id: `QE-${crypto.randomUUID()}`, quoteRequestId: id, ...values, createdAt: now })
    .onConflictDoUpdate({ target: quoteEstimates.quoteRequestId, set: values }).returning();
  if (payload.markReady === true) {
    const notification = notificationValues({
      recipientType: "CUSTOMER",
      recipientEmail: requesterEmail,
      type: "QUOTE_READY",
      title: "Үнийн санал бэлэн боллоо",
      message: `${vehicleMake} ${vehicleModel} автомашины үнийн санал бэлэн боллоо. Нийт тооцоо: ${totals.totalMnt.toLocaleString("mn-MN")} ₮.`,
      href: `/portal/quotes/${encodeURIComponent(id)}`,
      actorEmail: admin.email,
    });
    await getDb().batch([
      getDb().update(quoteRequests).set({ requesterEmail, status: "QUOTE_READY", updatedAt: now }).where(eq(quoteRequests.id, id)),
      getDb().insert(notifications).values(notification),
    ]);
  } else if (requesterEmail) {
    await getDb().update(quoteRequests).set({ requesterEmail, updatedAt: now }).where(eq(quoteRequests.id, id));
  }
  return Response.json({ estimate: saved, totals, status: payload.markReady === true ? "QUOTE_READY" : undefined });
}
