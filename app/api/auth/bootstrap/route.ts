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
  try {
    const body = await request.json() as { token?: unknown; password?: unknown; confirmPassword?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!matchesBootstrapToken(token)) return Response.json({ error: "Анхны тохиргооны код буруу байна." }, { status: 401 });
    if (password.length < 12 || password.length > 256) return Response.json({ error: "Нууц үг 12-оос доошгүй тэмдэгттэй байна." }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ error: "Нууц үг хоорондоо таарахгүй байна." }, { status: 400 });

    const db = getDb();
    const [existingSetup] = await db.select({ id: authBootstrap.id }).from(authBootstrap).where(eq(authBootstrap.id, "owner")).limit(1);
    if (existingSetup) return Response.json({ error: "Анхны админ тохиргоо аль хэдийн хийгдсэн байна." }, { status: 409 });

    const email = normalizeAuthEmail(OWNER_EMAIL);
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    await db.insert(authCredentials).values({ email, passwordHash, createdAt: now, updatedAt: now });
    await db.insert(authBootstrap).values({ id: "owner", completedAt: now });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Анхны тохиргоо хийгдсэн эсвэл Cloudflare D1 хүсэлтийг хадгалж чадсангүй." }, { status: 409 });
  }
}
