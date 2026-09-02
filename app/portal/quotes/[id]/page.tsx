import { and, eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { QuoteDecision } from "@/app/components/quote-decision";
import { requireCustomerPermission } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { quoteEstimates, quoteRequests } from "@/db/schema";
import { calculateQuote } from "@/lib/quote-calculation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

export default async function CustomerQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCustomerPermission(
    `/portal/quotes/${encodeURIComponent(id)}`,
    "CUSTOMER_QUOTES_VIEW",
  );
  const [row] = await getDb()
    .select({ quote: quoteRequests, estimate: quoteEstimates })
    .from(quoteRequests)
    .leftJoin(
      quoteEstimates,
      eq(quoteRequests.id, quoteEstimates.quoteRequestId),
    )
    .where(
      and(
        eq(quoteRequests.id, id),
        eq(quoteRequests.requesterEmail, user.email.toLowerCase()),
      ),
    )
    .limit(1);
  if (!row || !row.estimate)
    return (
      <DashboardShell
        role="customer"
        title="Үнийн санал олдсонгүй"
        subtitle="Энэ санал таны бүртгэлд хамаарахгүй байна."
        userName={user.displayName}
        userCode={user.email}
        rolePermissions={user.permissions}
      >
        <div className="quote-portal-empty">
          <FileText size={32} />
          <h2>Үнийн санал олдсонгүй</h2>
          <Link href="/portal">
            <ArrowLeft size={14} /> Миний хяналтын самбар
          </Link>
        </div>
      </DashboardShell>
    );
  const totals = calculateQuote(row.estimate);
  const awaitingDecision = row.quote.status === "QUOTE_READY";
  const accepted = row.quote.status === "CUSTOMER_ACCEPTED";
  return (
    <DashboardShell
      role="customer"
      title="Үнийн санал"
      subtitle={`${row.quote.id} · ${row.quote.market === "USA" ? "Америк" : "Солонгос"} автомашины урьдчилсан санал.`}
      userName={user.displayName}
      userCode={user.email}
      rolePermissions={user.permissions}
    >
      <Link className="back-link" href="/portal">
        <ArrowLeft size={14} /> Миний хяналтын самбар
      </Link>
      <section className="quote-portal-hero">
        <div>
          <span>ҮНИЙН САНАЛ · {row.quote.id}</span>
          <h1>
            {row.estimate.vehicleName ??
              `${row.estimate.vehicleMake ?? "Автомашин"} ${row.estimate.vehicleModel ?? ""}`}
          </h1>
          <p>
            {row.quote.status === "QUOTE_READY"
              ? "Таны шийдвэрийг хүлээж байна."
              : accepted
                ? "Та үнийн саналыг зөвшөөрсөн. Админ захиалгыг баталгаажуулна."
                : row.quote.status === "CUSTOMER_DECLINED"
                  ? "Та энэ саналаас татгалзсан."
                  : "Үнийн саналын төлөв шинэчлэгдэж байна."}
          </p>
        </div>
        <div className={`quote-portal-status ${accepted ? "accepted" : ""}`}>
          {accepted
            ? "ЗӨВШӨӨРСӨН"
            : row.quote.status === "QUOTE_READY"
              ? "ШИЙДВЭР ХҮЛЭЭЖ БУЙ"
              : row.quote.status}
        </div>
      </section>
      <div className="quote-portal-grid">
        <section className="dashboard-panel quote-portal-cost">
          <div className="panel-heading">
            <div>
              <span>ЗАДАРГАА</span>
              <h2>Монголд буух нийт үнэ</h2>
            </div>
          </div>
          <div className="quote-portal-lines">
            <div>
              <span>Машин + шимтгэл + Солонгос доторх тээвэр</span>
              <strong>{money.format(totals.koreaSubtotalMnt)} ₮</strong>
            </div>
            <div>
              <span>Олон улсын тээвэр</span>
              <strong>{money.format(totals.oceanFreightMnt)} ₮</strong>
            </div>
            <div>
              <span>Гааль, НӨАТ</span>
              <strong>
                {money.format(row.estimate.customsMnt + row.estimate.vatMnt)} ₮
              </strong>
            </div>
            <div>
              <span>Бусад зардал</span>
              <strong>{money.format(row.estimate.otherCostsMnt)} ₮</strong>
            </div>
            <div className="quote-portal-total">
              <span>Монголд буух нийт үнэ</span>
              <strong>{money.format(totals.totalMnt)} ₮</strong>
            </div>
            <div>
              <span>Урьдчилгаа · суурь дүнгийн 30%</span>
              <strong>{money.format(totals.depositMnt)} ₮</strong>
            </div>
            <div>
              <span>Машины үлдэгдэл · суурь дүнгийн 70%</span>
              <strong>{money.format(totals.balanceMnt)} ₮</strong>
            </div>
          </div>
        </section>
        <aside className="dashboard-panel quote-portal-side">
          <span>СОНГОСОН ЭХ СУРВАЛЖ</span>
          <h2>
            {row.estimate.vehicleMake ?? "Автомашин"}{" "}
            {row.estimate.vehicleModel ?? ""}
          </h2>
          <p>
            Энэхүү санал нь оруулсан ханш, тээвэр болон татварын урьдчилсан
            мэдээлэлд үндэслэнэ.
          </p>
          {row.quote.sourceUrl && (
            <a href={row.quote.sourceUrl} target="_blank" rel="noreferrer">
              Зарын эх сурвалж <ExternalLink size={13} />
            </a>
          )}
          {awaitingDecision && <QuoteDecision quoteId={row.quote.id} />}
          {accepted && (
            <div className="quote-accepted-note">
              Захиалга үүсгэхэд админ баталгаажуулалт хийнэ.
            </div>
          )}
        </aside>
      </div>
    </DashboardShell>
  );
}
