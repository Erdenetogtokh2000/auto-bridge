import { eq } from "drizzle-orm";
import { getCatalogManager } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { getVehicleBucket, isRemoteVehicleImage, storeRemoteVehicleImage } from "@/lib/vehicle-catalog";
import { requestIsSameOrigin } from "@/lib/cloudflare-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "invalid origin" }, { status: 403 });
  if (!await getCatalogManager()) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [vehicle] = await db.select({ id: vehicles.id, imageUrl: vehicles.imageUrl, imageObjectKey: vehicles.imageObjectKey, galleryImageUrls: vehicles.galleryImageUrls }).from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) return Response.json({ error: "vehicle not found" }, { status: 404 });
  let gallery: string[];
  try {
    const parsed: unknown = JSON.parse(vehicle.galleryImageUrls ?? "[]");
    gallery = Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
  } catch { return Response.json({ error: "invalid gallery" }, { status: 400 }); }

  let imageUrl = vehicle.imageUrl;
  let imageObjectKey = vehicle.imageObjectKey;
  let copied = 0;
  try {
    if (!imageObjectKey && imageUrl && isRemoteVehicleImage(imageUrl)) {
      const source = imageUrl;
      const key = await storeRemoteVehicleImage(id, source);
      try {
        imageObjectKey = key;
        imageUrl = null;
        gallery = gallery.map(url => url === source ? `/api/vehicle-images/${encodeURIComponent(id)}` : url);
        await db.update(vehicles).set({ imageObjectKey, imageUrl, galleryImageUrls: JSON.stringify(gallery), updatedAt: new Date().toISOString() }).where(eq(vehicles.id, id));
      } catch (error) { await getVehicleBucket().delete(key).catch(() => undefined); throw error; }
      copied++;
    }
    // Keep each Worker request short; the client calls again until the gallery is complete.
    for (let count = 0; count < 3; count++) {
      const index = gallery.findIndex(isRemoteVehicleImage);
      if (index < 0) break;
      const key = await storeRemoteVehicleImage(id, gallery[index]);
      try {
        gallery[index] = `/api/vehicle-images/${encodeURIComponent(id)}?image=${key.split("/").pop()}`;
        await db.update(vehicles).set({ galleryImageUrls: JSON.stringify(gallery), updatedAt: new Date().toISOString() }).where(eq(vehicles.id, id));
      } catch (error) { await getVehicleBucket().delete(key).catch(() => undefined); throw error; }
      copied++;
    }
    const remaining = gallery.filter(isRemoteVehicleImage).length + (imageUrl && !imageObjectKey && isRemoteVehicleImage(imageUrl) ? 1 : 0);
    return Response.json({ copied, remaining });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Зураг хадгалахад алдаа гарлаа.", copied }, { status: 502 });
  }
}
