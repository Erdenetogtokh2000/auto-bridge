import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { PrintInvoiceButton } from "@/app/components/print-invoice-button";
import { ConvertOrderButton } from "@/app/components/convert-order-button";
import { requireAdminPermission } from "@/app/chatgpt-auth";
import { Toaster } from "@/components/ui/sonner";
import { getDb } from "@/db";
import { orders, quoteEstimates, quoteRequests } from "@/db/schema";
import { calculateQuote } from "@/lib/quote-calculation";
import { BrandLogo } from "@/app/components/brand-logo";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const displayDate = (value: string) => new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`));

export default async function QuoteInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPermission(`/admin/quotes/${encodeURIComponent(id)}/invoice`, "QUOTES_MANAGE");
  const [row] = await getDb().select({ quote: quoteRequests, estimate: quoteEstimates })
    .from(quoteRequests).innerJoin(quoteEstimates, eq(quoteRequests.id, quoteEstimates.quoteRequestId))
    .where(eq(quoteRequests.id, id)).limit(1);
  if (!row) return <main className="invoice-not-found"><h1>Үнийн санал олдсонгүй</h1><Link href={`/admin/quotes/${encodeURIComponent(id)}`}><ArrowLeft/>Тооцооны хэсэг рүү буцах</Link></main>;
  const [order] = await getDb().select({ orderNo: orders.orderNo }).from(orders).where(eq(orders.quoteRequestId, id)).limit(1);

  const { quote, estimate } = row;
  const totals = calculateQuote(estimate);
  const validUntil = new Date(estimate.updatedAt.includes("T") ? estimate.updatedAt : `${estimate.updatedAt.replace(" ", "T")}Z`);
  validUntil.setDate(validUntil.getDate() + 7);
  return <main className="invoice-page">
    <div className="invoice-controls"><Link href={`/admin/quotes/${encodeURIComponent(id)}`}><ArrowLeft/>Тооцоо руу буцах</Link><div><PrintInvoiceButton/>{["QUOTE_READY", "CUSTOMER_ACCEPTED"].includes(quote.status) || order ? <ConvertOrderButton quoteId={id} existingOrderNo={order?.orderNo}/>: null}</div></div>
    <article className="invoice-sheet">
      <header className="invoice-header">
        <div className="invoice-brand"><BrandLogo /></div>
        <div className="invoice-title"><span>ҮНИЙН САНАЛ</span><strong>№ {quote.id}</strong></div>
      </header>

      <section className="invoice-meta">
        <div><span>ХАРИЛЦАГЧ</span><strong>{quote.requesterName ?? "Нэр оруулаагүй"}</strong><small>{quote.requesterPhone ?? "Утас оруулаагүй"} · {quote.requesterEmail ?? "И-мэйлгүй"}</small></div>
        <div><span>ҮҮССЭН ОГНОО</span><strong>{displayDate(estimate.updatedAt)}</strong><small>Хүчинтэй: {displayDate(validUntil.toISOString())} хүртэл</small></div>
        <div><span>ЗАХ ЗЭЭЛ</span><strong>{quote.market === "KOREA" ? "БНСУ" : quote.market}</strong><a href={quote.sourceUrl} target="_blank" rel="noreferrer">Зарын линк <ExternalLink/></a></div>
      </section>

      <section className="invoice-vehicle"><span>СОНГОСОН АВТОМАШИН</span><h1>{(estimate.vehicleName ?? `${estimate.vehicleMake ?? ""} ${estimate.vehicleModel ?? ""}`.trim()) || "Автомашины нэр оруулаагүй"}</h1><small>{estimate.productionYear ?? "—"} · {estimate.fuelType ?? "Түлш тодорхойгүй"}{estimate.engineCapacityCc ? ` · ${money.format(estimate.engineCapacityCc)} cc` : ""}</small></section>

      <table className="invoice-table">
        <thead><tr><th>Зардлын төрөл</th><th>Эх валют</th><th>Төгрөгөөр</th></tr></thead>
        <tbody>
          <tr><td>Машины үндсэн үнэ</td><td>{money.format(estimate.vehiclePriceKrw)} KRW</td><td>{money.format(Math.round(estimate.vehiclePriceKrw * estimate.krwMntRate))} ₮</td></tr>
          <tr><td>Худалдан авалтын шимтгэл</td><td>{money.format(estimate.purchaseFeeKrw)} KRW</td><td>{money.format(Math.round(estimate.purchaseFeeKrw * estimate.krwMntRate))} ₮</td></tr>
          <tr><td>Солонгос доторх тээвэр</td><td>{money.format(estimate.inlandTransportKrw)} KRW</td><td>{money.format(Math.round(estimate.inlandTransportKrw * estimate.krwMntRate))} ₮</td></tr>
          <tr><td>Олон улсын тээвэр</td><td>{money.format(estimate.oceanFreightUsd)} USD</td><td>{money.format(totals.oceanFreightMnt)} ₮</td></tr>
          <tr><td>Гаалийн татвар</td><td>-</td><td>{money.format(estimate.customsMnt)} ₮</td></tr>
          <tr><td>Онцгой албан татвар</td><td>-</td><td>{money.format(estimate.exciseMnt)} ₮</td></tr>
          <tr><td>НӨАТ</td><td>-</td><td>{money.format(estimate.vatMnt)} ₮</td></tr>
          <tr><td>Бусад зардал</td><td>-</td><td>{money.format(estimate.otherCostsMnt)} ₮</td></tr>
        </tbody>
      </table>

      <section className="invoice-totals">
        <div><span>Монголд буух нийт үнэ</span><strong>{money.format(totals.totalMnt)} ₮</strong></div>
        <div><span>Урьдчилгаа · суурь дүнгийн 30%</span><strong>{money.format(totals.depositMnt)} ₮</strong></div>
        <div className="invoice-balance"><span>Машины үлдэгдэл · суурь дүнгийн 70%</span><strong>{money.format(totals.balanceMnt)} ₮</strong></div>
      </section>

      {estimate.notes && <section className="invoice-notes"><span>НЭМЭЛТ ТАЙЛБАР</span><p>{estimate.notes}</p></section>}
      <footer className="invoice-footer"><p>Энэхүү үнийн санал нь оруулсан ханш, тээвэр, татварын мэдээлэлд үндэслэсэн бөгөөд зах зээлийн өөрчлөлтөөс шалтгаалан шинэчлэгдэж болно.</p><strong>AUTO BRIDGE</strong></footer>
    </article>
    <Toaster position="top-right" richColors />
  </main>;
}
