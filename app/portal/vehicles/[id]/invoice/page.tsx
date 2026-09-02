import Link from "next/link";
import { and, eq, or } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PrintInvoiceButton } from "@/app/components/print-invoice-button";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { orders, quoteEstimates, vehicles } from "@/db/schema";
import { calculateQuote } from "@/lib/quote-calculation";
import { BrandLogo } from "@/app/components/brand-logo";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const displayDate = (value: string) => {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

export default async function CustomerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCustomerPermission(`/portal/vehicles/${encodeURIComponent(id)}/invoice`, "CUSTOMER_DOCUMENT_DOWNLOAD");
  const [row] = await getDb().select({ order: orders, vehicle: vehicles, estimate: quoteEstimates })
    .from(orders)
    .innerJoin(vehicles, eq(orders.vehicleId, vehicles.id))
    .leftJoin(quoteEstimates, eq(orders.quoteRequestId, quoteEstimates.quoteRequestId))
    .where(and(eq(orders.customerEmail, user.email.toLowerCase()), or(eq(orders.orderNo, id), eq(orders.id, id))))
    .limit(1);
  if (!row?.estimate) return <main className="invoice-not-found"><h1>Нэхэмжлэх одоогоор бэлэн биш байна</h1><p>Энэ захиалгад үнийн тооцооны дэлгэрэнгүй мэдээлэл холбогдоогүй байна.</p><Link href="/portal"><ArrowLeft/>Миний автомашинууд</Link></main>;

  const { order, vehicle, estimate } = row;
  const totals = calculateQuote(estimate);
  return <main className="invoice-page customer-invoice-page">
    <div className="invoice-controls"><Link href={`/portal/vehicles/${encodeURIComponent(order.orderNo ?? order.id)}`}><ArrowLeft/>Захиалгын мэдээлэл рүү буцах</Link><PrintInvoiceButton/></div>
    <article className="invoice-sheet">
      <header className="invoice-header"><div className="invoice-brand"><BrandLogo /></div><div className="invoice-title"><span>ЗАХИАЛГЫН НЭХЭМЖЛЭХ</span><strong>№ {order.orderNo ?? order.id}</strong></div></header>
      <section className="invoice-meta"><div><span>ХАРИЛЦАГЧ</span><strong>{order.customerName ?? "Нэр оруулаагүй"}</strong><small>{order.customerPhone ?? "Утас оруулаагүй"} · {order.customerEmail}</small></div><div><span>ҮҮССЭН ОГНОО</span><strong>{displayDate(order.createdAt)}</strong><small>Захиалгын дугаар: {order.orderNo ?? order.id}</small></div><div><span>ЭХ ҮҮСВЭР</span><strong>{vehicle.sourceMarket === "KOREA" ? "БНСУ" : vehicle.sourceMarket}</strong>{vehicle.listingUrl && <a href={vehicle.listingUrl} target="_blank" rel="noreferrer">Зарын линк <ExternalLink/></a>}</div></section>
      <section className="invoice-vehicle"><span>ЗАХИАЛСАН АВТОМАШИН</span><h1>{vehicle.make} {vehicle.model}</h1><p>{vehicle.productionYear} · {vehicle.vin ? `VIN: ${vehicle.vin}` : "VIN бүртгэгдээгүй"} · {vehicle.mileageKm?.toLocaleString("mn-MN") ?? 0} км</p></section>
      <table className="invoice-table"><thead><tr><th>Зардлын төрөл</th><th>Эх валют</th><th>Төгрөгөөр</th></tr></thead><tbody>
        <tr><td>Машины үндсэн үнэ</td><td>{money.format(estimate.vehiclePriceKrw)} KRW</td><td>{money.format(Math.round(estimate.vehiclePriceKrw * estimate.krwMntRate))} ₮</td></tr>
        <tr><td>Худалдан авалтын шимтгэл</td><td>{money.format(estimate.purchaseFeeKrw)} KRW</td><td>{money.format(Math.round(estimate.purchaseFeeKrw * estimate.krwMntRate))} ₮</td></tr>
        <tr><td>Солонгос доторх тээвэр</td><td>{money.format(estimate.inlandTransportKrw)} KRW</td><td>{money.format(Math.round(estimate.inlandTransportKrw * estimate.krwMntRate))} ₮</td></tr>
        <tr><td>Олон улсын тээвэр</td><td>{money.format(estimate.oceanFreightUsd)} USD</td><td>{money.format(totals.oceanFreightMnt)} ₮</td></tr>
        <tr><td>Гаалийн татвар</td><td>-</td><td>{money.format(estimate.customsMnt)} ₮</td></tr>
        <tr><td>НӨАТ</td><td>-</td><td>{money.format(estimate.vatMnt)} ₮</td></tr>
        <tr><td>Бусад зардал</td><td>-</td><td>{money.format(estimate.otherCostsMnt)} ₮</td></tr>
      </tbody></table>
      <section className="invoice-totals"><div><span>Монголд буух нийт үнэ</span><strong>{money.format(totals.totalMnt)} ₮</strong></div><div><span>Урьдчилгаа · суурь дүнгийн 30%</span><strong>{money.format(totals.depositMnt)} ₮</strong></div><div className="invoice-balance"><span>Машины үлдэгдэл · суурь дүнгийн 70%</span><strong>{money.format(totals.balanceMnt)} ₮</strong></div></section>
      <footer className="invoice-footer"><p>Энэхүү нэхэмжлэх нь захиалгын бүртгэлд хадгалагдсан тооцоо, төлбөрийн мэдээлэлд үндэслэв.</p><strong>AUTO BRIDGE</strong></footer>
    </article>
  </main>;
}
