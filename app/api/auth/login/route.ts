import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { authCredentials, authLoginAttempts, authSessions, userProfiles } from "@/db/schema";
import { normalizeAuthEmail, randomToken, requestIsSameOrigin, sessionCookie, sessionExpiry, sha256, verifyPassword } from "@/lib/cloudflare-auth";

const OWNER_EMAIL = "erdenetogtokh2000@gmail.com";
const MAX_ATTEMPTS = 6;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Хүсэлт зөвшөөрөгдсөнгүй." }, { status: 403 });

  let email = "";
  let password = "";
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? normalizeAuthEmail(body.email) : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "И-мэйл болон нууц үгээ оруулна уу." }, { status: 400 });
  }
  if (!email || email.length > 254 || !email.includes("@") || !password || password.length > 256) {
    return Response.json({ error: "И-мэйл болон нууц үгээ шалгана уу." }, { status: 400 });
  }

  try {
    const db = getDb();
    const address = request.headers.get("cf-connecting-ip") ?? "unknown";
    const attemptKey = await sha256(email + "|" + address);
    const [attempt] = await db.select().from(authLoginAttempts).where(eq(authLoginAttempts.attemptKey, attemptKey)).limit(1);
    if (attempt?.lockedUntil && Date.parse(attempt.lockedUntil) > Date.now()) {
      return Response.json({ error: "Олон удаа буруу оролдсон байна. 15 минутын дараа дахин оролдоно уу." }, { status: 429 });
    }

    const [credential] = await db.select().from(authCredentials).where(eq(authCredentials.email, email)).limit(1);
    if (!credential) {
      const attempts = (attempt?.failedAttempts ?? 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await db.insert(authLoginAttempts).values({ attemptKey, failedAttempts: attempts, lockedUntil, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: authLoginAttempts.attemptKey, set: { failedAttempts: attempts, lockedUntil, updatedAt: new Date().toISOString() } });
      if (email === OWNER_EMAIL) {
        return Response.json({ error: "Cloudflare-д admin нууц үгийг анх тохируулаагүй байна. /setup-admin хуудсыг ашиглана уу." }, { status: 409 });
      }
      return Response.json({ error: "И-мэйл эсвэл нууц үг буруу байна." }, { status: 401 });
    }

    const valid = await verifyPassword(password, credential.passwordHash);
    if (!valid) {
      const attempts = (attempt?.failedAttempts ?? 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await db.insert(authLoginAttempts).values({ attemptKey, failedAttempts: attempts, lockedUntil, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: authLoginAttempts.attemptKey, set: { failedAttempts: attempts, lockedUntil, updatedAt: new Date().toISOString() } });
      return Response.json({ error: "И-мэйл эсвэл нууц үг буруу байна." }, { status: 401 });
    }

    const [profile] = await db.select({ status: userProfiles.status }).from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
    if (profile?.status === "SUSPENDED") {
      return Response.json({ error: "Энэ бүртгэлийн эрх түр түдгэлзсэн байна. Админтай холбогдоно уу." }, { status: 403 });
    }

    const token = randomToken();
    const now = new Date();
    const expiresAt = sessionExpiry(now);
    await db.insert(authSessions).values({ tokenHash: await sha256(token), email, expiresAt, createdAt: now.toISOString() });
    await db.delete(authLoginAttempts).where(eq(authLoginAttempts.attemptKey, attemptKey));
    await db.delete(authSessions).where(and(eq(authSessions.email, email), lt(authSessions.expiresAt, now.toISOString())));

    return Response.json({ ok: true }, {
      headers: {
        "Set-Cookie": sessionCookie(token),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Cloudflare нэвтрэлтийн өгөгдлийн сан түр холбогдсонгүй." }, { status: 503 });
  } finally {
    password = "";
  }
}
