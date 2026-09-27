type CatalogListing = {
  id: string;
  listingUrl: string;
  sourceMissingAt: string | null;
  status: string;
  imageObjectKey: string | null;
  galleryImageUrls: string;
};

type SourceAvailability = "available" | "missing" | "unknown";

const encarHosts = new Set(["encar.com", "www.encar.com", "fem.encar.com", "m.encar.com"]);
const carsHosts = new Set(["cars.com", "www.cars.com"]);

function sourceListingIdentity(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (encarHosts.has(host)) {
      const id = url.pathname.match(/(?:cars\/detail|dc_cardetailview\.do)\/?(\d{6,})/i)?.[1]
        ?? url.searchParams.get("carid") ?? url.searchParams.get("carId") ?? url.searchParams.get("id")
        ?? `${url.pathname}${url.search}`.match(/(?:carid=|detail\/)(\d{6,})/i)?.[1];
      return id && /^\d{6,}$/.test(id) ? `encar:${id}` : null;
    }
    if (carsHosts.has(host)) {
      const id = url.pathname.match(/(?:vehicledetail|vehicle)\/([a-z0-9-]+)/i)?.[1] ?? url.searchParams.get("listing_id");
      return id ? `cars:${id.toLowerCase()}` : null;
    }
  } catch { /* Unsupported or malformed listing URL. */ }
  return null;
}

export async function checkSourceAvailability(rawUrl: string, fetcher: typeof fetch = fetch): Promise<SourceAvailability> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return "unknown"; }
  if (url.protocol !== "https:" || url.username || url.password) return "unknown";

  let target: string;
  const host = url.hostname.toLowerCase();
  if (encarHosts.has(host)) {
    const id = sourceListingIdentity(rawUrl)?.slice("encar:".length);
    if (!id) return "unknown";
    target = `https://api.encar.com/v1/readside/vehicle/${id}?include=ADVERTISEMENT`;
  } else if (carsHosts.has(host)) {
    target = url.toString();
  } else return "unknown";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(target, {
      headers: {
        Accept: host.endsWith("encar.com") ? "application/json" : "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; AutoBridge/1.0; +https://autobridge.mn)",
      },
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 404 || response.status === 410) return "missing";
    if (response.ok) return "available";
    return "unknown";
  } catch { return "unknown"; }
  finally { clearTimeout(timer); }
}

function storedImageKeys(vehicle: CatalogListing): string[] {
  const keys = new Set<string>();
  const prefix = `vehicle-images/${vehicle.id}/`;
  if (vehicle.imageObjectKey?.startsWith(prefix)) keys.add(vehicle.imageObjectKey);
  try {
    const gallery: unknown = JSON.parse(vehicle.galleryImageUrls);
    if (Array.isArray(gallery)) {
      for (const url of gallery) {
        if (typeof url !== "string") continue;
        const filename = url.match(/^\/api\/vehicle-images\/VEH-[a-f0-9-]+\?image=([a-f0-9-]{36}\.(?:jpg|png|webp))$/i)?.[1];
        if (filename && url.startsWith(`/api/vehicle-images/${vehicle.id}?`)) keys.add(`${prefix}${filename}`);
      }
    }
  } catch { /* Old records can contain an invalid gallery. */ }
  return [...keys];
}

export async function syncSourceListings(db: D1Database, bucket: R2Bucket) {
  // Sample a bounded number of listings so a slow source cannot exhaust the cron invocation.
  const { results } = await db.prepare(`SELECT id, listing_url AS listingUrl, source_missing_at AS sourceMissingAt, status,
    image_object_key AS imageObjectKey, gallery_image_urls AS galleryImageUrls
    FROM vehicles WHERE listing_url IS NOT NULL
    AND source_market IN ('KOREA', 'USA') AND status <> 'ARCHIVED'
    ORDER BY RANDOM() LIMIT 80`).all<CatalogListing>();
  const now = new Date().toISOString();
  let pending = 0, archived = 0, removed = 0;
  for (const vehicle of results) {
    const availability = await checkSourceAvailability(vehicle.listingUrl);
    if (availability === "unknown") continue;
    if (availability === "available") {
      if (vehicle.sourceMissingAt) await db.prepare("UPDATE vehicles SET source_missing_at = NULL WHERE id = ? AND source_missing_at = ?")
        .bind(vehicle.id, vehicle.sourceMissingAt).run();
      continue;
    }
    if (!vehicle.sourceMissingAt) {
      await db.prepare("UPDATE vehicles SET source_missing_at = ? WHERE id = ? AND source_missing_at IS NULL")
        .bind(now, vehicle.id).run();
      pending++;
      continue;
    }
    // A second definite 404/410 at least an hour later confirms removal.
    if (Date.now() - Date.parse(vehicle.sourceMissingAt) < 60 * 60 * 1000) continue;
    const order = await db.prepare("SELECT 1 FROM orders WHERE vehicle_id = ? LIMIT 1").bind(vehicle.id).first();
    const identity = sourceListingIdentity(vehicle.listingUrl);
    const { results: quotes } = await db.prepare("SELECT source_url AS sourceUrl FROM quote_requests WHERE source_url = ? OR source_url LIKE ? LIMIT 500")
      .bind(vehicle.listingUrl, identity ? `%${identity.split(":")[1]}%` : vehicle.listingUrl).all<{ sourceUrl: string }>();
    const hasQuote = quotes.some(row => row.sourceUrl === vehicle.listingUrl || Boolean(identity && sourceListingIdentity(row.sourceUrl) === identity));
    if (order || hasQuote || vehicle.status !== "AVAILABLE") {
      await db.prepare("UPDATE vehicles SET status = 'ARCHIVED', is_published = 0, is_featured = 0, updated_at = ? WHERE id = ? AND source_missing_at = ?")
        .bind(now, vehicle.id, vehicle.sourceMissingAt).run();
      archived++;
      continue;
    }
    const result = await db.prepare(`DELETE FROM vehicles WHERE id = ? AND source_missing_at = ?
      AND status = 'AVAILABLE' AND NOT EXISTS (SELECT 1 FROM orders WHERE vehicle_id = ?)
      AND NOT EXISTS (SELECT 1 FROM quote_requests WHERE source_url = ?)`).bind(vehicle.id, vehicle.sourceMissingAt, vehicle.id, vehicle.listingUrl).run();
    if (result.meta.changes) {
      removed++;
      for (const key of storedImageKeys(vehicle)) await bucket.delete(key).catch(error => console.error("R2 cleanup failed", vehicle.id, error));
    }
  }
  console.log("Source listing sync", { checked: results.length, pending, archived, removed });
}
