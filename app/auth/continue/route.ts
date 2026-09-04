import { NextResponse } from "next/server";
import { getAuthenticatedRole, roleHomePath } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const role = await getAuthenticatedRole();
  const origin = new URL(request.url).origin;
  const destination = role ? roleHomePath(role) : "/login";
  return NextResponse.redirect(new URL(destination, origin));
}
