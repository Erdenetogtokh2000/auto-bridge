import { eq } from "drizzle-orm";
import { getCatalogManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { getVehicleBucket, normalizeVehicleForm, storeVehicleImage } from "@/lib/vehicle-catalog";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "invalid form" }, { status: 400 });
  const id = `VEH-${crypto.randomUUID()}`;
  let objectKey: string | null = null;
  try {
    const values = normalizeVehicleForm(formData);
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) objectKey = await storeVehicleImage(id, file);
    const db = getDb();
    const [duplicate] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.stockNo, values.stockNo)).limit(1);
    if (duplicate) {
      if (objectKey) await getVehicleBucket().delete(objectKey);
      return Response.json({ error: "stock number already exists" }, { status: 409 });
    }
    const now = new Date().toISOString();
    const [created] = await db.insert(vehicles).values({ id, ...values, imageUrl: objectKey ? null : values.imageUrl, imageObjectKey: objectKey, createdBy: admin.email.toLowerCase(), updatedAt: now }).returning();
    return Response.json({ vehicle: created }, { status: 201 });
  } catch (error) {
    if (objectKey) await getVehicleBucket().delete(objectKey).catch(() => undefined);
    return Response.json({ error: error instanceof Error ? error.message : "invalid request" }, { status: 400 });
  }
}
