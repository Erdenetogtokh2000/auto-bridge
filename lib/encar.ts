import { normalizeVehicleFuelClass, type VehicleFuelClass } from "@/lib/vehicle-import-taxes";

export type EncarVehicleSummary = {
  carId: string;
  sourceUrl: string;
  make: string | null;
  model: string | null;
  grade: string | null;
  productionYear: number | null;
  mileageKm: number | null;
  fuelName: string | null;
  fuelClass: VehicleFuelClass;
  engineCapacityCc: number | null;
  priceKrw: number | null;
  imageUrl: string | null;
  imageUrls: string[];
};

const ENCAR_HOSTS = new Set(["encar.com", "www.encar.com", "fem.encar.com", "m.encar.com"]);

export function extractEncarCarId(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (![...ENCAR_HOSTS].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    const pathMatch = url.pathname.match(/(?:cars\/detail|dc_cardetailview\.do\/?)\/?(\d{6,})/i);
    if (pathMatch?.[1]) return pathMatch[1];
    const queryId = url.searchParams.get("carid") ?? url.searchParams.get("carId") ?? url.searchParams.get("id");
    if (queryId && /^\d{6,}$/.test(queryId)) return queryId;
    const generic = `${url.pathname}${url.search}`.match(/(?:carid=|detail\/)(\d{6,})/i);
    return generic?.[1] ?? null;
  } catch {
    return null;
  }
}

function parseYear(value: unknown) {
  const match = String(value ?? "").match(/(19|20)\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  const current = new Date().getFullYear();
  return year >= 1980 && year <= current + 1 ? year : null;
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeEncarFuel(value: unknown): VehicleFuelClass {
  const raw = String(value ?? "").trim();
  const normalized = raw.toUpperCase();
  if (/전기|ELECTRIC|\bEV\b/.test(normalized)) return "ELECTRIC";
  if (/하이브리드|전기\+|HYBRID|LPG|엘피지/.test(normalized)) return "HYBRID_LPG";
  return normalizeVehicleFuelClass(normalized);
}

export async function fetchEncarVehicle(rawUrl: string): Promise<EncarVehicleSummary | null> {
  const carId = extractEncarCarId(rawUrl);
  if (!carId) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`https://api.encar.com/v1/readside/vehicle/${encodeURIComponent(carId)}?include=MANAGE,SPEC,CONDITION,ADVERTISEMENT,CATEGORY,PHOTOS`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://www.encar.com",
        Referer: "https://www.encar.com/",
        "User-Agent": "Mozilla/5.0 (compatible; AutoBridge/1.0; +https://autobridge.mn)",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as Record<string, unknown>;
    const category = (payload.category ?? {}) as Record<string, unknown>;
    const spec = (payload.spec ?? {}) as Record<string, unknown>;
    const advertisement = (payload.advertisement ?? {}) as Record<string, unknown>;
    const photos = Array.isArray(payload.photos) ? payload.photos as Array<Record<string, unknown>> : [];

    const priceManwon = positiveNumber(advertisement.price);
    const imageUrls = [...new Set(photos.map((photo) => String(photo.path ?? "").trim()).filter(Boolean).map((path) => path.startsWith("http") ? path : `https://ci.encar.com${path}`))];
    const photoPath = String(photos.find((photo) => photo.type === "OUTER")?.path ?? photos[0]?.path ?? "").trim();
    const imageUrl = photoPath ? (photoPath.startsWith("http") ? photoPath : `https://ci.encar.com${photoPath}`) : null;
    const fuelName = String(spec.fuelName ?? "").trim() || null;

    return {
      carId,
      sourceUrl: rawUrl,
      make: String(category.manufacturerEnglishName ?? category.manufacturerName ?? "").trim() || null,
      model: String(category.modelGroupEnglishName ?? category.modelName ?? category.modelGroupName ?? "").trim() || null,
      grade: String(category.gradeEnglishName ?? category.gradeName ?? "").trim() || null,
      productionYear: parseYear(category.yearMonth ?? category.formYear),
      mileageKm: positiveNumber(spec.mileage) ? Math.round(Number(spec.mileage)) : null,
      fuelName,
      fuelClass: normalizeEncarFuel(fuelName),
      engineCapacityCc: positiveNumber(spec.displacement) ? Math.round(Number(spec.displacement)) : null,
      priceKrw: priceManwon ? Math.round(priceManwon * 10_000) : null,
      imageUrl,
      imageUrls,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
