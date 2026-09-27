import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authSessions } from "@/db/schema";
import { sessionCookie, sha256 } from "@/lib/cloudflare-auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auto_bridge_session")?.value;
  if (token) {
    try {
      await getDb().delete(authSessions).where(eq(authSessions.tokenHash, await sha256(token)));
    } catch {
      // Clear the browser cookie even if D1 is temporarily unavailable.
    }
  }
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": sessionCookie("", 0), "Cache-Control": "no-store" },
  });
}
