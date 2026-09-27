import { eq } from "drizzle-orm";
import { getCatalogManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { getVehicleBucket } from "@/lib/vehicle-catalog";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vehicle] = await getDb().select({ imageObjectKey: vehicles.imageObjectKey, galleryImageUrls: vehicles.galleryImageUrls, isPublished: vehicles.isPublished }).from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) return Response.json({ error: "image not found" }, { status: 404 });
  if (!vehicle.isPublished && !await getAdminUser()) return Response.json({ error: "image not found" }, { status: 404 });
  const filename = new URL(request.url).searchParams.get("image");
  let key = vehicle.imageObjectKey;
  if (filename !== null) {
    if (!/^VEH-[a-f0-9-]+$/i.test(id) || !/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(filename)) return Response.json({ error: "image not found" }, { status: 404 });
    const path = `/api/vehicle-images/${encodeURIComponent(id)}?image=${filename}`;
    try {
      const gallery: unknown = JSON.parse(vehicle.galleryImageUrls ?? "[]");
      if (!Array.isArray(gallery) || !gallery.includes(path)) return Response.json({ error: "image not found" }, { status: 404 });
    } catch { return Response.json({ error: "image not found" }, { status: 404 }); }
    key = `vehicle-images/${id}/${filename}`;
  }
  if (!key) return Response.json({ error: "image not found" }, { status: 404 });
  const object = await getVehicleBucket().get(key);
  if (!object) return Response.json({ error: "image not found" }, { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": vehicle.isPublished ? "public, max-age=86400" : "private, no-store", "x-content-type-options": "nosniff" } });
}
