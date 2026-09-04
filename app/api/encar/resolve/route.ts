import { fetchEncarVehicle, extractEncarCarId } from "@/lib/encar";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!url) return Response.json({ error: "url_required" }, { status: 400 });
  if (!extractEncarCarId(url)) return Response.json({ error: "unsupported_encar_url" }, { status: 400 });

  const vehicle = await fetchEncarVehicle(url);
  if (!vehicle) return Response.json({ error: "encar_lookup_failed" }, { status: 502 });

  return Response.json({ vehicle }, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
