import { isRemoteVehicleImage, storeRemoteVehicleImage } from "../lib/vehicle-catalog";

type ImageRow = {
  id: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
  galleryImageUrls: string;
};

export async function backfillVehicleImages(db: D1Database, bucket: R2Bucket) {
  // Bound each invocation: a busy or unavailable image host must not hold up the next cron run.
  const { results } = await db.prepare(`SELECT id, image_url AS imageUrl, image_object_key AS imageObjectKey,
    gallery_image_urls AS galleryImageUrls FROM vehicles
    WHERE image_url LIKE 'https://%' OR gallery_image_urls LIKE '%https://%'
    ORDER BY RANDOM() LIMIT 8`).all<ImageRow>();
  let copied = 0;
  for (const vehicle of results) {
    const primary = vehicle.imageUrl;
    let gallery: string[];
    let galleryRaw = vehicle.galleryImageUrls;
    try {
      const parsed: unknown = JSON.parse(vehicle.galleryImageUrls || "[]");
      gallery = Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
    } catch { continue; }

    if (!vehicle.imageObjectKey && primary && isRemoteVehicleImage(primary)) {
      try {
        const key = await storeRemoteVehicleImage(vehicle.id, primary, async (objectKey, bytes, contentType) => {
          await bucket.put(objectKey, bytes, { httpMetadata: { contentType } });
        });
        try {
          const nextGallery = gallery.map(url => url === primary ? `/api/vehicle-images/${encodeURIComponent(vehicle.id)}` : url);
          const result = await db.prepare(`UPDATE vehicles SET image_object_key = ?, image_url = NULL,
            gallery_image_urls = ?, updated_at = ? WHERE id = ? AND image_object_key IS NULL
            AND image_url = ? AND gallery_image_urls = ?`)
            .bind(key, JSON.stringify(nextGallery), new Date().toISOString(), vehicle.id, primary, vehicle.galleryImageUrls).run();
          if (result.meta.changes) { copied++; gallery = nextGallery; galleryRaw = JSON.stringify(nextGallery); }
          else await bucket.delete(key);
        } catch (error) { await bucket.delete(key).catch(() => undefined); throw error; }
      } catch (error) { console.error("Vehicle primary image backfill failed", vehicle.id, error); }
    }

    // Copy at most two gallery images per vehicle per run; the next run resumes.
    for (let count = 0; count < 2; count++) {
      const index = gallery.findIndex(isRemoteVehicleImage);
      if (index < 0) break;
      const source = gallery[index];
      try {
        const key = await storeRemoteVehicleImage(vehicle.id, source, async (objectKey, bytes, contentType) => {
          await bucket.put(objectKey, bytes, { httpMetadata: { contentType } });
        });
        try {
          const nextGallery = [...gallery];
          nextGallery[index] = `/api/vehicle-images/${encodeURIComponent(vehicle.id)}?image=${key.split("/").pop()}`;
          const result = await db.prepare(`UPDATE vehicles SET gallery_image_urls = ?, updated_at = ?
            WHERE id = ? AND gallery_image_urls = ?`)
            .bind(JSON.stringify(nextGallery), new Date().toISOString(), vehicle.id, galleryRaw).run();
          if (result.meta.changes) { copied++; gallery = nextGallery; galleryRaw = JSON.stringify(nextGallery); }
          else { await bucket.delete(key); break; }
        } catch (error) { await bucket.delete(key).catch(() => undefined); throw error; }
      } catch (error) { console.error("Vehicle gallery image backfill failed", vehicle.id, error); break; }
    }
  }
  console.log("Vehicle R2 image backfill", { checked: results.length, copied });
}
