import { getDb } from "@/db";
import { notifications, quoteEstimates, quoteRequests, userProfiles } from "@/db/schema";
import { notificationValues } from "@/lib/notifications";
import { calculateQuote } from "@/lib/quote-calculation";
import { calculateVehicleImportTaxes, normalizeVehicleFuelClass } from "@/lib/vehicle-import-taxes";
import { fetchEncarVehicle, extractEncarCarId } from "@/lib/encar";

function redirect(request: Request, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME?.trim();
  const publicOrigin = renderHost
    ? `https://${renderHost}`
    : forwardedHost
      ? `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`
      : new URL(request.url).origin;
  return Response.redirect(new URL(path, publicOrigin), 303);
}

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
    return redirect(request, "/?quoteError=invalid-url#quote");
  }
  if (!requesterName || !requesterPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return redirect(request, "/?quoteError=contact-required#quote");
  }

  const encarVehicle = !expoId && sourceUrlInput && extractEncarCarId(sourceUrlInput)
    ? await fetchEncarVehicle(sourceUrlInput)
    : null;
  const shouldCreateEstimate = calculatorSubmitted || Boolean(encarVehicle);

  const id = `QR-${Date.now().toString(36).toUpperCase()}`;
  const db = getDb();
  const now = new Date().toISOString();

  const estimate = shouldCreateEstimate ? (() => {
    const vehicleCurrency = String(formData.get("vehicleCurrency") ?? "KRW").toUpperCase() === "USD" ? "USD" : "KRW";
    const krwMntRate = numberValue("krwMntRate", 2.6) || 2.6;
    const usdMntRate = numberValue("usdMntRate", 3500) || 3500;
    const vehiclePrice = numberValue("vehiclePrice", encarVehicle?.priceKrw ?? 0) || encarVehicle?.priceKrw || 0;
    const productionYear = Math.min(Math.max(Math.round(numberValue("productionYear", encarVehicle?.productionYear ?? new Date().getFullYear() - 3)), 1980), new Date().getFullYear());
    const rawFuelType = String(formData.get("fuelType") ?? encarVehicle?.fuelClass ?? "GASOLINE_DIESEL");
    const fuelType = normalizeVehicleFuelClass(rawFuelType);
    const engineCapacityCc = fuelType === "ELECTRIC" ? 0 : Math.round(numberValue("engineCapacityCc", encarVehicle?.engineCapacityCc ?? 2000) || encarVehicle?.engineCapacityCc || 2000);
    const purchaseFeeMnt = numberValue("purchaseFeeMnt");
    const inlandTransportMnt = numberValue("inlandTransportMnt");
    const oceanFreightUsd = numberValue("oceanFreightUsd", 1800);
    const currencyRate = vehicleCurrency === "USD" ? usdMntRate : krwMntRate;
    const customsValueMnt = vehiclePrice * currencyRate + purchaseFeeMnt + inlandTransportMnt + oceanFreightUsd * usdMntRate;
    const taxes = calculateVehicleImportTaxes({ customsValueMnt, productionYear, engineCapacityCc, fuelClass: fuelType });
    const vehiclePriceKrw = Math.round(vehicleCurrency === "USD" ? vehiclePrice * usdMntRate / krwMntRate : vehiclePrice);
    const purchaseFeeKrw = Math.round(purchaseFeeMnt / krwMntRate);
    const inlandTransportKrw = Math.round(inlandTransportMnt / krwMntRate);
    const numbers = {
      vehiclePriceKrw,
      purchaseFeeKrw,
      inlandTransportKrw,
      oceanFreightUsd,
      krwMntRate,
      usdMntRate,
      customsMnt: taxes.customsMnt,
      exciseMnt: taxes.exciseMnt,
      vatMnt: taxes.vatMnt,
      otherCostsMnt: Math.round(numberValue("otherCostsMnt")),
      depositMnt: Math.round(numberValue("depositMnt")),
    };
    const totals = calculateQuote(numbers);
    const vehicleMake = encarVehicle?.make ?? null;
    const vehicleModel = encarVehicle?.model ?? null;
    const vehicleName = [vehicleMake, vehicleModel, encarVehicle?.grade].filter(Boolean).join(" ") || null;
    const note = [
      encarVehicle ? "Encar линкээс машины үндсэн мэдээллийг автоматаар татсан." : "Нийтийн тооцоолуураас үүссэн урьдчилсан дүн.",
      `Зах зээл: ${market}.`,
      `Эх үнэ: ${vehiclePrice.toLocaleString("mn-MN")} ${vehicleCurrency}.`,
      `Үйлдвэрлэсэн он: ${productionYear}, түлш: ${encarVehicle?.fuelName ?? fuelType}, хөдөлгүүр: ${engineCapacityCc || "EV"} cc.`,
      encarVehicle?.mileageKm ? `Гүйлт: ${encarVehicle.mileageKm.toLocaleString("mn-MN")} км.` : "",
      `ОАТ: ${taxes.exciseMnt.toLocaleString("mn-MN")} ₮.`,
      "Харилцагчийн өгсөн болон автоматаар татсан мэдээллийг админ баталгаажуулж шинэчилнэ.",
    ].filter(Boolean).join(" ");

    return {
      id: `QE-${crypto.randomUUID()}`,
      quoteRequestId: id,
      vehicleName,
      vehicleMake,
      vehicleModel,
      productionYear,
      mileageKm: encarVehicle?.mileageKm ?? 0,
      fuelType,
      engineCapacityCc,
      ...numbers,
      depositMnt: totals.depositMnt,
      totalMnt: totals.totalMnt,
      notes: note,
      createdAt: now,
      updatedAt: now,
    };
  })() : null;

  await db.batch([
    db.insert(quoteRequests).values({ id, sourceUrl, market, requesterName, requesterPhone, requesterEmail, updatedAt: now }),
    db.insert(userProfiles).values({ id: `USR-${crypto.randomUUID()}`, email: requesterEmail, fullName: requesterName, phone: requesterPhone, role: "CUSTOMER", status: "ACTIVE", createdBy: "PUBLIC_QUOTE", updatedAt: now }).onConflictDoUpdate({ target: userProfiles.email, set: { fullName: requesterName, phone: requesterPhone, updatedAt: now } }),
    db.insert(notifications).values(notificationValues({ recipientType: "ADMIN", type: "QUOTE_REQUEST", title: expoId ? "Шинэ Expo бүртгэлийн хүсэлт" : "Шинэ үнийн хүсэлт", message: expoId ? `${requesterName} ${expoTitle || "Expo"}-д бүртгүүлэх хүсэлт илгээлээ.` : `${requesterName} автомашины үнийн хүсэлт илгээлээ.${encarVehicle ? " Encar мэдээлэл автоматаар танигдсан." : ""}`, href: "/admin#quotes", actorEmail: requesterEmail })),
    ...(estimate ? [db.insert(quoteEstimates).values(estimate)] : []),
  ]);

  return redirect(request, `/request-received?ref=${encodeURIComponent(id)}`);
}
