import { env } from "cloudflare:workers";

export const vehicleMarkets = ["KOREA", "USA", "MONGOLIA"] as const;
export const vehicleStatuses = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;
export const vehicleCurrencies = ["KRW", "USD", "MNT"] as const;

function optionalUrl(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const url = new URL(text);
  if (!/^https?:$/.test(url.protocol)) throw new Error("INVALID_URL");
  return url.toString();
}

export function normalizeVehicleForm(formData: FormData) {
  const stockNo = String(formData.get("stockNo") ?? "").trim().toUpperCase();
  const sourceMarket = String(formData.get("sourceMarket") ?? "KOREA") as typeof vehicleMarkets[number];
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const productionYear = Number(formData.get("productionYear") ?? 0);
  const mileageKm = Number(formData.get("mileageKm") ?? 0);
  const vin = String(formData.get("vin") ?? "").trim().toUpperCase();
  const engineCapacityCc = Number(formData.get("engineCapacityCc") ?? 0);
  const priceAmount = Number(formData.get("priceAmount") ?? 0);
  const priceCurrency = String(formData.get("priceCurrency") ?? "KRW") as typeof vehicleCurrencies[number];
  const status = String(formData.get("status") ?? "AVAILABLE") as typeof vehicleStatuses[number];
  if (!stockNo || stockNo.length > 80 || !make || make.length > 100 || !model || model.length > 120) throw new Error("INVALID_REQUIRED_FIELDS");
  if (!vehicleMarkets.includes(sourceMarket) || !vehicleStatuses.includes(status) || !vehicleCurrencies.includes(priceCurrency)) throw new Error("INVALID_OPTION");
  if (!Number.isInteger(productionYear) || productionYear < 1950 || productionYear > 2100 || !Number.isFinite(mileageKm) || mileageKm < 0 || mileageKm > 10_000_000 || !Number.isFinite(engineCapacityCc) || engineCapacityCc < 0 || engineCapacityCc > 20_000 || !Number.isFinite(priceAmount) || priceAmount < 0 || priceAmount > 10_000_000_000_000) throw new Error("INVALID_NUMBER");
  const trim = String(formData.get("trim") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const fuelType = String(formData.get("fuelType") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (vin.length > 32 || trim.length > 160 || color.length > 80 || fuelType.length > 80 || description.length > 1200) throw new Error("INVALID_TEXT");
  return {
    stockNo, sourceMarket, listingUrl: optionalUrl(formData.get("listingUrl")),
    make, model, productionYear, mileageKm: Math.round(mileageKm), vin: vin || null, fuelType: fuelType || null,
    trim: trim || null, color: color || null, engineCapacityCc: engineCapacityCc ? Math.round(engineCapacityCc) : null,
    priceAmount, priceCurrency, priceKrw: priceCurrency === "KRW" ? Math.round(priceAmount) : null,
    imageUrl: optionalUrl(formData.get("imageUrl")), description: description || null,
    status, isPublished: formData.get("isPublished") === "true", isFeatured: formData.get("isFeatured") === "true",
  };
}

export function getVehicleBucket(): R2Bucket {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket) throw new Error("Cloudflare R2 binding `BUCKET` is unavailable.");
  return bucket;
}

export async function storeVehicleImage(vehicleId: string, file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedTypes.has(file.type) || !["jpg", "jpeg", "png", "webp"].includes(extension) || file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  const objectKey = `vehicle-images/${vehicleId}/${crypto.randomUUID()}.${extension}`;
  await getVehicleBucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  return objectKey;
}
