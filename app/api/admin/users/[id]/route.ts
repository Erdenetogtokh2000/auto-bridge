import { eq } from "drizzle-orm";
import { getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import { normalizeUserProfile } from "@/lib/user-profiles";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [current] = await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1);
  if (!current) return Response.json({ error: "user not found" }, { status: 404 });
  try {
    const values = normalizeUserProfile({ ...(await request.json() as Record<string, unknown>), email: current.email });
    if (current.email === admin.email.toLowerCase() && (values.role !== "ADMIN" || values.status !== "ACTIVE")) {
      return Response.json({ error: "cannot remove your own access" }, { status: 409 });
    }
    const [updated] = await db.update(userProfiles).set({ ...values, email: current.email, updatedAt: new Date().toISOString() }).where(eq(userProfiles.id, id)).returning();
    return Response.json({ user: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "invalid request" }, { status: 400 });
  }
}
