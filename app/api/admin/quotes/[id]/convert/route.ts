import { eq } from "drizzle-orm";
import { getQuotesManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { notifications, orders, payments, quoteEstimates, quoteRequests, vehicles } from "@/db/schema";
import { calculateQuote } from "@/lib/quote-calculation";
import { notificationValues } from "@/lib/notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin=await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [existing] = await db.select().from(orders).where(eq(orders.quoteRequestId, id)).limit(1);
  if (existing) return Response.json({ order: existing, existing: true });
  const [row] = await db.select({ quote: quoteRequests, estimate: quoteEstimates }).from(quoteRequests)
    .innerJoin(quoteEstimates, eq(quoteRequests.id, quoteEstimates.quoteRequestId)).where(eq(quoteRequests.id, id)).limit(1);
  if (!row || !["QUOTE_READY", "CUSTOMER_ACCEPTED"].includes(row.quote.status)) return Response.json({ error: "quote is not ready" }, { status: 409 });
  const { quote, estimate } = row;
  if (!quote.requesterEmail || !estimate.vehicleMake || !estimate.vehicleModel || !estimate.productionYear) return Response.json({ error: "required details missing" }, { status: 400 });
  const now = new Date().toISOString();
  const day = now.slice(2, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  const orderNo = `KA-${day}-${suffix}`;
  const vehicleId = `VEH-${crypto.randomUUID()}`;
  const orderId = `ORD-${crypto.randomUUID()}`;
  const totals = calculateQuote(estimate);
  if (totals.totalMnt <= 0) return Response.json({ error: "total must be positive" }, { status: 400 });
  const depositAmountMnt = totals.depositMnt;
  const balanceAmountMnt = totals.balanceMnt;
  const depositDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await db.batch([
    db.insert(vehicles).values({ id: vehicleId, stockNo: `STK-${orderNo}`, sourceMarket: quote.market, listingUrl: quote.sourceUrl, make: estimate.vehicleMake, model: estimate.vehicleModel, productionYear: estimate.productionYear, mileageKm: estimate.mileageKm, fuelType: estimate.fuelType, priceKrw: estimate.vehiclePriceKrw, status: "RESERVED" }),
    db.insert(orders).values({ id: orderId, orderNo, quoteRequestId: id, vehicleId, customerName: quote.requesterName, customerPhone: quote.requesterPhone, customerEmail: quote.requesterEmail, status: "AWAITING_DEPOSIT", totalAmountMnt: totals.totalMnt, vehicleSubtotalMnt: totals.koreaSubtotalMnt, depositAmountMnt, balanceAmountMnt, updatedAt: now }),
    db.insert(payments).values({ id: `PAY-${crypto.randomUUID()}`, orderId, paymentType: "DEPOSIT", currency: "MNT", amount: depositAmountMnt, amountMnt: depositAmountMnt, status: "PENDING", dueDate: depositDueDate, note: "Захиалга баталгаажуулах 30%-ийн урьдчилгаа", updatedAt: now }),
    db.update(quoteRequests).set({ status: "CONVERTED", updatedAt: now }).where(eq(quoteRequests.id, id)),
    db.insert(notifications).values(notificationValues({recipientType:"CUSTOMER",recipientEmail:quote.requesterEmail,orderId,type:"ORDER_CREATED",title:"Захиалга үүслээ",message:`${estimate.vehicleMake} ${estimate.vehicleModel} автомашины ${orderNo} захиалга үүслээ. 30%-ийн урьдчилгаа төлбөрийг захиалга баталгаажуулахаас өмнө төлнө үү.`,href:`/portal/vehicles/${encodeURIComponent(orderNo)}`,actorEmail:admin.email})),
  ]);
  const [created] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return Response.json({ order: created });
}
