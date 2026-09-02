import { MapPin, Ship } from "lucide-react";

export function ShipmentLocationMap({ origin, location, destination }: { origin?: string | null; location: string | null; destination: string | null }) {
  const place = location?.trim() || destination?.trim() || "Улаанбаатар";
  const stops = [origin?.trim() || "БНСУ", place, destination?.trim() || "Улаанбаатар"];
  return <section className="shipment-map-card"><div className="shipment-map-heading"><div><span>ТЭЭВРИЙН МАРШРУТ</span><h3><MapPin size={15}/> Одоогийн цэг: {place}</h3></div><small>Дотоод мэдээлэл</small></div><div className="shipment-route-map" aria-label={`Тээврийн маршрут: ${stops.join(" → ")}`}>{stops.map((stop, index)=><div className={index === 1 ? "current" : index === stops.length - 1 ? "destination" : "origin"} key={`${stop}-${index}`}><i>{index === 1 ? <Ship size={14}/> : <MapPin size={14}/>}</i><span><small>{index === 0 ? "ЭХЛЭЛ" : index === 1 ? "ОДОО" : "ХҮРЭХ ЦЭГ"}</small><strong>{stop}</strong></span></div>)}</div><p className="shipment-map-note">Байршлыг админ эсвэл тээврийн ажилтан шинэчлэх бүрд энэ маршрут шинэчлэгдэнэ. Байршлын мэдээллийг гаднын үйлчилгээ рүү дамжуулахгүй.</p></section>;
}
