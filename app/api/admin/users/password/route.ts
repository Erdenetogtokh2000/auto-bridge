import { eq } from "drizzle-orm";
import { getAdminUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { authCredentials, userProfiles } from "@/db/schema";
import { hashPassword, normalizeAuthEmail, requestIsSameOrigin } from "@/lib/cloudflare-auth";

const OWNER_EMAIL = "erdenetogtokh2000@gmail.com";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Хүсэлт зөвшөөрөгдсөнгүй." }, { status: 403 });
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "Зөвшөөрөлгүй." }, { status: 401 });
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? normalizeAuthEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 254 || !email.includes("@")) return Response.json({ error: "И-мэйл буруу байна." }, { status: 400 });
    if (password.length < 12 || password.length > 256) return Response.json({ error: "Нууц үг 12-оос доошгүй тэмдэгттэй байна." }, { status: 400 });
    const [profile] = await getDb().select({ status: userProfiles.status }).from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
    if (!profile && email !== OWNER_EMAIL) return Response.json({ error: "Хэрэглэгчийн профайл олдсонгүй." }, { status: 404 });
    if (profile?.status === "SUSPENDED") return Response.json({ error: "Түдгэлзсэн хэрэглэгчийн нууц үгийг өөрчлөх боломжгүй." }, { status: 409 });
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    await getDb().insert(authCredentials).values({ email, passwordHash, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: authCredentials.email, set: { passwordHash, updatedAt: now } });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Нууц үгийг Cloudflare D1-д хадгалж чадсангүй." }, { status: 503 });
  }
}
