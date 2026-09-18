import { importVehicleFromUrl, VehicleImportError } from "@/lib/vehicle-source-import";
import { normalizeVehicleFuelClass } from "@/lib/vehicle-import-taxes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url || url.length > 2_000) {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }

  try {
    const imported = await importVehicleFromUrl(url);
    if (!imported) {
      return Response.json({ error: "unsupported_or_unavailable_listing" }, { status: 422 });
    }

    return Response.json({
      vehicle: {
        source: imported.source,
        market: imported.sourceMarket,
        make: imported.make,
        model: imported.model,
        grade: imported.trim,
        productionYear: imported.productionYear,
        mileageKm: imported.mileageKm,
        fuelName: imported.fuelType,
        fuelClass: normalizeVehicleFuelClass(imported.fuelType ?? ""),
        engineCapacityCc: imported.engineCapacityCc,
        priceAmount: imported.priceAmount,
        priceCurrency: imported.priceCurrency,
      },
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof VehicleImportError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json({ error: "listing_service_unavailable" }, { status: 502 });
  }
}
