import { getAuthenticatedRole, roleHomePath } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = await getAuthenticatedRole();
  const destination = role ? roleHomePath(role) : "/login";

  // Use a relative Location header so the browser keeps the public Render
  // hostname instead of following Render's internal localhost:10000 origin.
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination,
      "Cache-Control": "no-store",
    },
  });
}
