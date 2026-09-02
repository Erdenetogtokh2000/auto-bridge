import { eq } from "drizzle-orm";
import { getCatalogManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { getVehicleBucket } from "@/lib/vehicle-catalog";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vehicle] = await getDb().select({ imageObjectKey: vehicles.imageObjectKey, isPublished: vehicles.isPublished }).from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle?.imageObjectKey) return Response.json({ error: "image not found" }, { status: 404 });
  if (!vehicle.isPublished && !await getAdminUser()) return Response.json({ error: "image not found" }, { status: 404 });
  const object = await getVehicleBucket().get(vehicle.imageObjectKey);
  if (!object) return Response.json({ error: "image not found" }, { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": vehicle.isPublished ? "public, max-age=86400" : "private, no-store", "x-content-type-options": "nosniff" } });
}
