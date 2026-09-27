import { getSupabaseBucket } from "@/lib/supabase-bucket";

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
  let galleryImageUrls: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("galleryImageUrls") ?? "[]"));
    if (Array.isArray(parsed)) galleryImageUrls = [...new Set(parsed.map(String).filter(value =>
      /^https?:\/\//i.test(value) || /^\/api\/vehicle-images\/VEH-[a-f0-9-]+(?:\?image=[a-f0-9-]+\.(?:jpg|png|webp))?$/i.test(value)
    ))].slice(0, 80);
  } catch { throw new Error("INVALID_GALLERY"); }
  if (vin.length > 32 || trim.length > 160 || color.length > 80 || fuelType.length > 80 || description.length > 1200) throw new Error("INVALID_TEXT");
  return {
    stockNo, sourceMarket, listingUrl: optionalUrl(formData.get("listingUrl")),
    make, model, productionYear, mileageKm: Math.round(mileageKm), vin: vin || null, fuelType: fuelType || null,
    trim: trim || null, color: color || null, engineCapacityCc: engineCapacityCc ? Math.round(engineCapacityCc) : null,
    priceAmount, priceCurrency, priceKrw: priceCurrency === "KRW" ? Math.round(priceAmount) : null,
    imageUrl: optionalUrl(formData.get("imageUrl")), galleryImageUrls: JSON.stringify(galleryImageUrls), description: description || null,
    status, isPublished: formData.get("isPublished") === "true", isFeatured: formData.get("isFeatured") === "true",
  };
}

export function getVehicleBucket() {
  return getSupabaseBucket("auto-bridge-files");
}

export async function storeVehicleImage(vehicleId: string, file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedTypes.has(file.type) || !["jpg", "jpeg", "png", "webp"].includes(extension) || file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  const objectKey = `vehicle-images/${vehicleId}/${crypto.randomUUID()}.${extension}`;
  await getVehicleBucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  return objectKey;
}

const remoteImageHosts = new Set(["ci.encar.com", "platform.cstatic-images.com"]);

export function isRemoteVehicleImage(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && remoteImageHosts.has(url.hostname.toLowerCase());
  } catch { return false; }
}

export async function storeRemoteVehicleImage(vehicleId: string, imageUrl: string) {
  if (!isRemoteVehicleImage(imageUrl)) throw new Error("Энэ зургийн эх сурвалжийг R2-д хуулж болохгүй байна.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(imageUrl, { redirect: "error", signal: controller.signal, headers: { Accept: "image/jpeg,image/png,image/webp" } });
    if (!response.ok || !response.body || Number(response.headers.get("content-length") || 0) > 5 * 1024 * 1024)
      throw new Error("Эх зургийг татаж чадсангүй эсвэл 5 MB-аас том байна.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Эх зураг 5 MB-аас том байна.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const jpeg = size > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = size > 7 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const webp = size > 11 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
    if (!jpeg && !png && !webp) throw new Error("Эх сурвалжаас зураг биш файл ирлээ.");
    const extension = jpeg ? "jpg" : png ? "png" : "webp";
    const contentType = jpeg ? "image/jpeg" : png ? "image/png" : "image/webp";
    const key = `vehicle-images/${vehicleId}/${crypto.randomUUID()}.${extension}`;
    await getVehicleBucket().put(key, bytes.buffer, { httpMetadata: { contentType } });
    return key;
  } finally { clearTimeout(timer); }
}
