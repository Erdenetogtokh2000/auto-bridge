import { fetchEncarVehicle, extractEncarCarId } from "@/lib/encar";

export type ImportedVehicle = {
  source: "ENCAR" | "CARS_COM";
  sourceMarket: "KOREA" | "USA";
  stockNo: string;
  listingUrl: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  productionYear: number | null;
  mileageKm: number | null;
  vin: string | null;
  fuelType: string | null;
  color: string | null;
  engineCapacityCc: number | null;
  priceAmount: number | null;
  priceCurrency: "KRW" | "USD";
  imageUrl: string | null;
  imageUrls: string[];
  description: string | null;
};

export class VehicleImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "VehicleImportError";
  }
}

const CARS_HOSTS = new Set(["cars.com", "www.cars.com"]);

function clean(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function numeric(value: unknown) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function yearFrom(value: unknown) {
  const match = String(value ?? "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function uniqueImages(values: unknown[]) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value]).map(clean).filter((value): value is string => Boolean(value && /^https?:\/\//i.test(value))))].slice(0, 80);
}

function jsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record, ...jsonLdNodes(record["@graph"] ?? [])];
}

function extractListingId(url: URL) {
  return url.pathname.match(/(?:vehicledetail|vehicle)\/([a-z0-9-]+)/i)?.[1]
    ?? url.searchParams.get("listing_id")
    ?? url.pathname.match(/([a-f0-9]{8}-[a-f0-9-]{27,})/i)?.[1]
    ?? `CARS-${Date.now()}`;
}

function engineCapacityFromText(value: unknown) {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)\s*l\b/i);
  return match ? Math.round(Number(match[1]) * 1000) : null;
}

type ApifyCarsRecord = Record<string, unknown> & {
  listingId?: unknown;
  stockNumber?: unknown;
  title?: unknown;
  year?: unknown;
  make?: unknown;
  model?: unknown;
  trim?: unknown;
  price?: unknown;
  mileage?: unknown;
  vin?: unknown;
  fuelType?: unknown;
  exteriorColor?: unknown;
  engine?: unknown;
  photos?: unknown;
  primaryThumbnail?: unknown;
  description?: unknown;
  sellerNotes?: unknown;
  adDescription?: unknown;
};

async function fetchCarsVehicleViaApify(url: URL, token: string): Promise<ImportedVehicle | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110_000);
  try {
    const endpoint = new URL("https://api.apify.com/v2/acts/memo23~cars-scraper/run-sync-get-dataset-items");
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("clean", "true");
    endpoint.searchParams.set("timeout", "100");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startUrls: [url.toString()],
        maxItems: 1,
        maxConcurrency: 1,
        fetchDetails: true,
        fetchBatteryReport: false,
        enrichEmails: false,
        fetchDealerPhone: false,
        fetchDealerProfile: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 402 || response.status === 403) {
        throw new VehicleImportError(
          "CARS_PROVIDER_AUTH_FAILED",
          "Cars.com импортын API token буруу эсвэл Apify-ийн үнэгүй credit дууссан байна.",
          503,
        );
      }
      throw new VehicleImportError("CARS_PROVIDER_UNAVAILABLE", "Cars.com мэдээллийн үйлчилгээ түр хариу өгөхгүй байна.", 503);
    }
    const records = await response.json().catch(() => null) as ApifyCarsRecord[] | null;
    const record = Array.isArray(records) ? records[0] : null;
    if (!record) return null;
    const photos = uniqueImages([record.photos, record.primaryThumbnail]);
    const miles = numeric(record.mileage);
    const listingId = clean(record.listingId) ?? extractListingId(url);
    return {
      source: "CARS_COM",
      sourceMarket: "USA",
      stockNo: clean(record.stockNumber) ?? `US-${listingId}`.toUpperCase().slice(0, 80),
      listingUrl: url.toString(),
      make: clean(record.make),
      model: clean(record.model),
      trim: clean(record.trim),
      productionYear: yearFrom(record.year ?? record.title),
      mileageKm: miles ? Math.round(miles * 1.609344) : null,
      vin: clean(record.vin),
      fuelType: clean(record.fuelType),
      color: clean(record.exteriorColor),
      engineCapacityCc: engineCapacityFromText(record.engine),
      priceAmount: numeric(record.price),
      priceCurrency: "USD",
      imageUrl: photos[0] ?? null,
      imageUrls: photos,
      description: clean(record.description ?? record.sellerNotes ?? record.adDescription),
    };
  } catch (error) {
    if (error instanceof VehicleImportError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new VehicleImportError("CARS_PROVIDER_TIMEOUT", "Cars.com мэдээлэл татах хугацаа хэтэрлээ. Дахин оролдоно уу.", 504);
    }
    throw new VehicleImportError("CARS_PROVIDER_UNAVAILABLE", "Cars.com мэдээллийн үйлчилгээтэй холбогдож чадсангүй.", 503);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCarsVehicle(url: URL): Promise<ImportedVehicle | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const nodes = scripts.flatMap((match) => {
      try { return jsonLdNodes(JSON.parse(match[1])); } catch { return []; }
    });
    const vehicle = nodes.find((node) => /Vehicle|Car|Product/i.test(String(node["@type"] ?? ""))) ?? nodes.find((node) => node.vehicleIdentificationNumber || node.mileageFromOdometer);
    if (!vehicle) return null;
    const offers = (vehicle.offers && typeof vehicle.offers === "object" ? vehicle.offers : {}) as Record<string, unknown>;
    const mileage = (vehicle.mileageFromOdometer && typeof vehicle.mileageFromOdometer === "object" ? vehicle.mileageFromOdometer : {}) as Record<string, unknown>;
    const engine = (vehicle.vehicleEngine && typeof vehicle.vehicleEngine === "object" ? vehicle.vehicleEngine : {}) as Record<string, unknown>;
    const brand = (vehicle.brand && typeof vehicle.brand === "object" ? vehicle.brand : {}) as Record<string, unknown>;
    const images = uniqueImages([vehicle.image, vehicle.images]);
    const name = clean(vehicle.name);
    const productionYear = yearFrom(vehicle.modelDate ?? vehicle.vehicleModelDate ?? name);
    const make = clean(brand.name ?? vehicle.manufacturer);
    let model = clean(vehicle.model);
    if (!model && name) model = name.replace(String(productionYear ?? ""), "").replace(make ?? "", "").trim() || null;
    return {
      source: "CARS_COM",
      sourceMarket: "USA",
      stockNo: `US-${extractListingId(url)}`.toUpperCase().slice(0, 80),
      listingUrl: url.toString(),
      make,
      model,
      trim: clean(vehicle.vehicleConfiguration ?? vehicle.vehicleTrim),
      productionYear,
      mileageKm: numeric(mileage.value ?? vehicle.mileage) ? Math.round(Number(numeric(mileage.value ?? vehicle.mileage)) * 1.609344) : null,
      vin: clean(vehicle.vehicleIdentificationNumber),
      fuelType: clean(vehicle.fuelType),
      color: clean(vehicle.color),
      engineCapacityCc: numeric(engine.engineDisplacement) ? Math.round(Number(numeric(engine.engineDisplacement)) * 1000) : null,
      priceAmount: numeric(offers.price ?? vehicle.price),
      priceCurrency: "USD",
      imageUrl: images[0] ?? null,
      imageUrls: images,
      description: clean(vehicle.description),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function importVehicleFromUrl(rawUrl: string): Promise<ImportedVehicle | null> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  if (extractEncarCarId(rawUrl)) {
    const vehicle = await fetchEncarVehicle(rawUrl);
    if (!vehicle) return null;
    return {
      source: "ENCAR", sourceMarket: "KOREA", stockNo: `KR-${vehicle.carId}`,
      listingUrl: rawUrl, make: vehicle.make, model: vehicle.model, trim: vehicle.grade,
      productionYear: vehicle.productionYear, mileageKm: vehicle.mileageKm, vin: null,
      fuelType: vehicle.fuelName, color: null, engineCapacityCc: vehicle.engineCapacityCc,
      priceAmount: vehicle.priceKrw, priceCurrency: "KRW", imageUrl: vehicle.imageUrl,
      imageUrls: vehicle.imageUrls, description: null,
    };
  }
  if (CARS_HOSTS.has(url.hostname.toLowerCase())) {
    const apifyToken = process.env.APIFY_TOKEN?.trim();
    if (apifyToken) return fetchCarsVehicleViaApify(url, apifyToken);
    const direct = await fetchCarsVehicle(url);
    if (direct) return direct;
    throw new VehicleImportError(
      "CARS_PROVIDER_NOT_CONFIGURED",
      "Cars.com автомат импортын APIFY_TOKEN Render дээр тохируулагдаагүй байна.",
      503,
    );
  }
  return null;
}
