import { eq } from "drizzle-orm";
import { getCatalogManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { getVehicleBucket, normalizeVehicleForm, storeVehicleImage } from "@/lib/vehicle-catalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [current] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!current) return Response.json({ error: "vehicle not found" }, { status: 404 });
  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "invalid form" }, { status: 400 });
  let newObjectKey: string | null = null;
  try {
    const values = normalizeVehicleForm(formData);
    const [duplicate] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.stockNo, values.stockNo)).limit(1);
    if (duplicate && duplicate.id !== id) return Response.json({ error: "stock number already exists" }, { status: 409 });
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) newObjectKey = await storeVehicleImage(id, file);
    const externalImage = values.imageUrl;
    const [updated] = await db.update(vehicles).set({
      ...values,
      imageUrl: newObjectKey ? null : externalImage ?? current.imageUrl,
      imageObjectKey: newObjectKey ? newObjectKey : externalImage ? null : current.imageObjectKey,
      updatedAt: new Date().toISOString(),
    }).where(eq(vehicles.id, id)).returning();
    return Response.json({ vehicle: updated });
  } catch (error) {
    if (newObjectKey) await getVehicleBucket().delete(newObjectKey).catch(() => undefined);
    return Response.json({ error: error instanceof Error ? error.message : "invalid request" }, { status: 400 });
  }
}

// Catalog removal is a soft delete so existing quotes/orders keep their vehicle reference.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const [current] = await getDb().select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!current) return Response.json({ error: "vehicle not found" }, { status: 404 });
  const [updated] = await getDb().update(vehicles).set({
    status: "ARCHIVED",
    isPublished: false,
    isFeatured: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(vehicles.id, id)).returning();
  return Response.json({ vehicle: updated });
}
