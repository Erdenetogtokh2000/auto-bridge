import { ne, and, desc, eq } from "drizzle-orm";
import { PublicHeader } from "@/app/components/public-header";
import { PublicVehicleCatalog, type CatalogVehicle } from "@/app/components/public-vehicle-catalog";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";

export const dynamic="force-dynamic";
export default async function VehiclesPage({ searchParams }: { searchParams?: Promise<{ market?: string | string[] }> }){
  const params = await searchParams;
  const marketParam = Array.isArray(params?.market) ? params?.market[0] : params?.market;
  const initialMarket = marketParam === "KOREA" || marketParam === "USA" || marketParam === "MONGOLIA" ? marketParam : "ALL";
  const rows=await getDb().select().from(vehicles).where(and(eq(vehicles.isPublished,true),ne(vehicles.status,"ARCHIVED"))).orderBy(desc(vehicles.isFeatured),desc(vehicles.createdAt));
  const catalog:CatalogVehicle[]=rows.map(row=>({id:row.id,stockNo:row.stockNo,sourceMarket:row.sourceMarket as CatalogVehicle["sourceMarket"],listingUrl:row.listingUrl,make:row.make,model:row.model,productionYear:row.productionYear,mileageKm:row.mileageKm??0,fuelType:row.fuelType,trim:row.trim,priceAmount:Number(row.priceAmount??row.priceKrw??0),priceCurrency:(row.priceCurrency??"KRW") as CatalogVehicle["priceCurrency"],imageUrl:row.imageUrl,imageObjectKey:row.imageObjectKey,description:row.description,status:row.status as CatalogVehicle["status"]}));
  return <main className="catalog-page"><PublicHeader section="Автомашины каталог"/><PublicVehicleCatalog vehicles={catalog} initialMarket={initialMarket}/></main>;
}
