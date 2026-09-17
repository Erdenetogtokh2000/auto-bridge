import { getCatalogManager as getAdminUser } from "@/app/chatgpt-auth";
import { importVehicleFromUrl, VehicleImportError } from "@/lib/vehicle-source-import";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 2_000) return Response.json({ error: "invalid url" }, { status: 400 });
  try {
    const vehicle = await importVehicleFromUrl(url);
    if (!vehicle) return Response.json({ error: "listing could not be imported" }, { status: 422 });
    return Response.json({ vehicle });
  } catch (error) {
    if (error instanceof VehicleImportError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json({ error: "listing service unavailable" }, { status: 502 });
  }
}
