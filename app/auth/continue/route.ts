import { eq } from "drizzle-orm";
import { getAuthenticatedRole, getChatGPTUser, roleHomePath } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";

export const dynamic = "force-dynamic";

async function ensureCustomerProfile() {
  const user = await getChatGPTUser();
  if (!user) return;

  try {
    const db = getDb();
    const email = user.email.trim().toLowerCase();
    const [existing] = await db.select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.email, email))
      .limit(1);

    if (existing) return;

    await db.insert(userProfiles).values({
      id: `USR-${crypto.randomUUID()}`,
      email,
      fullName: user.fullName ?? user.displayName ?? email,
      role: "CUSTOMER",
      permissions: "[]",
      permissionsCustomized: false,
      status: "ACTIVE",
      financingEligible: false,
      createdBy: "PUBLIC_SIGNUP",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Authentication and routing should still work if profile persistence is
    // temporarily unavailable. The next authenticated visit can retry.
  }
}

export async function GET() {
  let role = await getAuthenticatedRole();

  // Public self-registration is customer-only. Staff roles are never granted
  // from the signup form; they must already exist as Admin-managed profiles.
  if (role === "CUSTOMER") {
    await ensureCustomerProfile();
    role = await getAuthenticatedRole();
  }

  const destination = role ? roleHomePath(role) : "/login";

  // Use a relative Location header so the browser keeps the public hostname
  // instead of following Render's internal localhost origin.
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination,
      "Cache-Control": "no-store",
    },
  });
}
