import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSettingsManager as getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { systemSettings } from "@/db/schema";

const settingsSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  supportEmail: z.string().trim().email().max(200),
  contactPhone: z.string().trim().min(4).max(50),
  officeHours: z.string().trim().min(3).max(160),
  krwMntRate: z.coerce.number().positive().max(1000),
  usdMntRate: z.coerce.number().positive().max(100000),
  depositPercent: z.coerce.number().int().min(1).max(100),
  paymentReminderDays: z.coerce.number().int().min(0).max(90),
  emailNotifications: z.boolean(),
  transportNotifications: z.boolean(),
  documentNotifications: z.boolean(),
});

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid settings" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const values = {
    ...parsed.data,
    updatedBy: admin.email.toLowerCase(),
    updatedAt: now,
  };

  await db.insert(systemSettings).values({ id: "default", ...values })
    .onConflictDoUpdate({ target: systemSettings.id, set: values });

  const [settings] = await db.select().from(systemSettings)
    .where(eq(systemSettings.id, "default")).limit(1);
  return Response.json({ settings });
}
