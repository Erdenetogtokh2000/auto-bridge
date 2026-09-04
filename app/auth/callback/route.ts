import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/login";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeNext(url.searchParams.get("next"));
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: destination,
      "Cache-Control": "no-store",
    },
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !supabaseUrl || !publishableKey) return response;

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.headers.get("cookie")?.split(";").filter(Boolean).map((item) => {
        const [name, ...rest] = item.trim().split("=");
        return { name, value: rest.join("=") };
      }) ?? [],
      setAll: (entries) => entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
