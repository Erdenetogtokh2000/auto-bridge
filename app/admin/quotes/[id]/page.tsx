import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { QuoteEstimateForm } from "@/app/components/quote-estimate-form";
import { getDb } from "@/db";
import { quoteEstimates, quoteRequests } from "@/db/schema";
import { requireAdminPermission } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function QuoteEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireAdminPermission(`/admin/quotes/${encodeURIComponent(id)}`, "QUOTES_MANAGE");
  const [quote] = await getDb().select().from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1);
  if (!quote) return <DashboardShell role="admin" title="Үнийн хүсэлт олдсонгүй" subtitle="Хүсэлтийн дугаар буруу эсвэл устсан байна." adminPermissions={actor.permissions} isSystemAdmin={actor.isAdmin}><Link className="estimate-back" href="/admin"><ArrowLeft/>Админ хэсэг рүү буцах</Link></DashboardShell>;
  const [estimate] = await getDb().select().from(quoteEstimates).where(eq(quoteEstimates.quoteRequestId, id)).limit(1);
  const initialEstimate = estimate ? {
    ...estimate,
    productionYear: estimate.productionYear ?? undefined,
    mileageKm: estimate.mileageKm ?? undefined,
    engineCapacityCc: estimate.engineCapacityCc ?? undefined,
  } : null;
  return <DashboardShell role="admin" title="Үнийн санал бэлтгэх" subtitle={`${quote.requesterName ?? "Нэргүй харилцагч"} · ${quote.requesterPhone ?? "Утасгүй"}`} userName={actor.displayName} userCode={actor.email} adminPermissions={actor.permissions} isSystemAdmin={actor.isAdmin}>
    <div className="estimate-toolbar"><Link className="estimate-back" href="/admin"><ArrowLeft/>Хүсэлтийн жагсаалт</Link><a className="estimate-source" href={quote.sourceUrl} target="_blank" rel="noreferrer">Зарын эх сурвалж <ExternalLink/></a></div>
    <QuoteEstimateForm quoteId={id} initial={initialEstimate} requesterEmail={quote.requesterEmail}/>
  </DashboardShell>;
}
