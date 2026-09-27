export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = url.searchParams.get("next");
  const safeDestination = destination?.startsWith("/") && !destination.startsWith("//") ? destination : "/login";
  return new Response(null, {
    status: 303,
    headers: { Location: safeDestination, "Cache-Control": "no-store" },
  });
}
