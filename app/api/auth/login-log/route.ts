import { eq } from "drizzle-orm";
import { getAuthenticatedRole, getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import { userLoginLogs } from "@/db/user-login-log-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const role = await getAuthenticatedRole();
  const now = new Date().toISOString();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(userLoginLogs).values({
        id: `LOG-${crypto.randomUUID()}`,
        email: user.email.toLowerCase(),
        role,
        result: "SUCCESS",
        ipAddress: forwardedFor,
        userAgent,
        source: "LOGIN_FORM",
        loggedInAt: now,
      });
      await tx.update(userProfiles)
        .set({ lastLoginAt: now, updatedAt: now })
        .where(eq(userProfiles.email, user.email.toLowerCase()));
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 202 });
  }
}
