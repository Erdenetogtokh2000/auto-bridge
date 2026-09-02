import { getDb } from "@/db";
import { notifications, quoteEstimates, quoteRequests, userProfiles } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";
import { calculateQuote } from "@/lib/quote-calculation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const sourceUrlInput = String(formData.get("vehicleUrl") ?? formData.get("listingUrl") ?? "").trim();
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterPhone = String(formData.get("requesterPhone") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim().toLowerCase();
  const sourceUrl = sourceUrlInput && /^https?:\/\//i.test(sourceUrlInput) ? sourceUrlInput : new URL("/calculator", request.url).toString();
  const expoId = String(formData.get("expoId") ?? "").trim();
  const expoTitle = String(formData.get("expoTitle") ?? "").trim();
  const market = expoId ? "EXPO" : (String(formData.get("market") ?? "KOREA").toUpperCase() === "USA" ? "USA" : "KOREA");
  const calculatorSubmitted = String(formData.get("calculatorSubmitted") ?? "") === "true";
  const numberValue = (name: string, fallback = 0) => {
    const value = Number(formData.get(name) ?? fallback);
    return Number.isFinite(value) && value >= 0 && value <= 1_000_000_000_000_000 ? value : fallback;
  };
  if (sourceUrlInput && !/^https?:\/\//i.test(sourceUrlInput)) {
    return Response.redirect(new URL("/?quoteError=invalid-url#quote", request.url), 303);
  }
  if (!requesterName || !requesterPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return Response.redirect(new URL("/?quoteError=contact-required#quote", request.url), 303);
  }
  const id = `QR-${Date.now().toString(36).toUpperCase()}`;
  const db=getDb();
  const now = new Date().toISOString();
  const estimate = calculatorSubmitted ? (() => {
    const vehicleCurrency = String(formData.get("vehicleCurrency") ?? "KRW").toUpperCase() === "USD" ? "USD" : "KRW";
    const krwMntRate = numberValue("krwMntRate", 2.6) || 2.6;
    const usdMntRate = numberValue("usdMntRate", 3500) || 3500;
    const vehiclePrice = numberValue("vehiclePrice");
    const vehiclePriceKrw = Math.round(vehicleCurrency === "USD" ? vehiclePrice * usdMntRate / krwMntRate : vehiclePrice);
    const purchaseFeeKrw = Math.round(numberValue("purchaseFeeMnt") / krwMntRate);
    const inlandTransportKrw = Math.round(numberValue("inlandTransportMnt") / krwMntRate);
    const numbers = { vehiclePriceKrw, purchaseFeeKrw, inlandTransportKrw, oceanFreightUsd: numberValue("oceanFreightUsd"), krwMntRate, usdMntRate, customsMnt: Math.round(numberValue("customsMnt")), vatMnt: Math.round(numberValue("vatMnt")), otherCostsMnt: Math.round(numberValue("otherCostsMnt")), depositMnt: Math.round(numberValue("depositMnt")) };
    const totals = calculateQuote(numbers);
    const note = [`Нийтийн тооцоолуураас үүссэн урьдчилсан дүн. Зах зээл: ${market}.`, `Эх үнэ: ${vehiclePrice.toLocaleString("mn-MN")} ${vehicleCurrency}.`, `Харилцагчийн өгсөн тооцооллыг админ баталгаажуулж шинэчилнэ.`].join(" ");
    return { id: `QE-${crypto.randomUUID()}`, quoteRequestId: id, ...numbers, depositMnt: totals.depositMnt, totalMnt: totals.totalMnt, notes: note, createdAt: now, updatedAt: now };
  })() : null;
  await db.batch([
    db.insert(quoteRequests).values({ id, sourceUrl, market, requesterName, requesterPhone, requesterEmail, updatedAt: now }),
    db.insert(userProfiles).values({ id: `USR-${crypto.randomUUID()}`, email: requesterEmail, fullName: requesterName, phone: requesterPhone, role: "CUSTOMER", status: "ACTIVE", createdBy: "PUBLIC_QUOTE", updatedAt: now }).onConflictDoUpdate({ target: userProfiles.email, set: { fullName: requesterName, phone: requesterPhone, updatedAt: now } }),
    db.insert(notifications).values(notificationValues({recipientType:"ADMIN",type:"QUOTE_REQUEST",title:expoId?"Шинэ Expo бүртгэлийн хүсэлт":"Шинэ үнийн хүсэлт",message:expoId?`${requesterName} ${expoTitle||"Expo"}-д бүртгүүлэх хүсэлт илгээлээ.`:`${requesterName} автомашины үнийн хүсэлт илгээлээ.`,href:`/admin#quotes`,actorEmail:requesterEmail})),
    ...(estimate ? [db.insert(quoteEstimates).values(estimate)] : []),
  ]);
  return Response.redirect(new URL(`/request-received?ref=${encodeURIComponent(id)}`, request.url), 303);
}
