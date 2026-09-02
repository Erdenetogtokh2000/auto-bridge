import { eq } from "drizzle-orm";
import { getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import { normalizeUserProfile } from "@/lib/user-profiles";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const values = normalizeUserProfile(await request.json() as Record<string, unknown>);
    const db = getDb();
    const [existing] = await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.email, values.email)).limit(1);
    if (existing) return Response.json({ error: "email already exists" }, { status: 409 });
    const now = new Date().toISOString();
    const [created] = await db.insert(userProfiles).values({ id: `USR-${crypto.randomUUID()}`, ...values, createdBy: admin.email.toLowerCase(), updatedAt: now }).returning();
    return Response.json({ user: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "invalid request" }, { status: 400 });
  }
}
