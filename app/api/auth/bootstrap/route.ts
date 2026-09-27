import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authBootstrap, authCredentials } from "@/db/schema";
import { bootstrapTokenConfigured, hashPassword, matchesBootstrapToken, normalizeAuthEmail, requestIsSameOrigin } from "@/lib/cloudflare-auth";

const OWNER_EMAIL = "erdenetogtokh2000@gmail.com";

export async function GET() {
  try {
    const [setup] = await getDb().select({ id: authBootstrap.id }).from(authBootstrap).where(eq(authBootstrap.id, "owner")).limit(1);
    if (setup) return Response.json({ state: "complete" }, { headers: { "Cache-Control": "no-store" } });
    if (!bootstrapTokenConfigured()) return Response.json({ state: "missing_secret" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return Response.json({ state: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ state: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Хүсэлт зөвшөөрөгдсөнгүй." }, { status: 403 });
  if (!globalThis.autoBridgeAuthBootstrapToken) return Response.json({ error: "Cloudflare-д AUTH_BOOTSTRAP_TOKEN secret тохируулаагүй байна." }, { status: 503 });
  let stage = "request";
  try {
    stage = "read_request";
    const body = await request.json() as { token?: unknown; password?: unknown; confirmPassword?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!matchesBootstrapToken(token)) return Response.json({ error: "Анхны тохиргооны код буруу байна." }, { status: 401 });
    if (password.length < 12 || password.length > 256) return Response.json({ error: "Нууц үг 12-оос доошгүй тэмдэгттэй байна." }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ error: "Нууц үг хоорондоо таарахгүй байна." }, { status: 400 });

    stage = "check_setup";
    const db = getDb();
    const [existingSetup] = await db.select({ id: authBootstrap.id }).from(authBootstrap).where(eq(authBootstrap.id, "owner")).limit(1);
    if (existingSetup) return Response.json({ error: "Анхны админ тохиргоо аль хэдийн хийгдсэн байна." }, { status: 409 });

    const email = normalizeAuthEmail(OWNER_EMAIL);
    stage = "hash_password";
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    stage = "save_credentials";
    await db.insert(authCredentials).values({ email, passwordHash, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: authCredentials.email, set: { passwordHash, updatedAt: now } });
    stage = "save_setup_marker";
    await db.insert(authBootstrap).values({ id: "owner", completedAt: now }).onConflictDoNothing();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Log only a stage and error type. Never log request data, credentials, or SQL values.
    console.error("Admin bootstrap failed", { stage, errorName: error instanceof Error ? error.name : "UnknownError" });
    const message = stage === "hash_password"
      ? "Нууц үгийг боловсруулах үед алдаа гарлаа."
      : stage === "save_credentials"
        ? "D1-д админы нэвтрэх мэдээллийг хадгалахад алдаа гарлаа."
        : stage === "save_setup_marker"
          ? "Нэвтрэх мэдээлэл хадгалагдсан ч D1 анхны тохиргоог баталгаажуулж чадсангүй. Дахин оролдоно уу."
          : "Анхны тохиргооны хүсэлтийг боловсруулахад алдаа гарлаа.";
    return Response.json({ error: message, stage }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
