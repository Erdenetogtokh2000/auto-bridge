"use client";

import { BadgeCheck, Ban, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function QuoteDecision({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function decide(decision: "ACCEPT" | "DECLINE") {
    setBusy(true);
    try {
      const response = await fetch(`/api/portal/quotes/${encodeURIComponent(quoteId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw new Error();
      toast.success(decision === "ACCEPT" ? "Үнийн саналыг зөвшөөрлөө." : "Татгалзсан шийдвэр бүртгэгдлээ.");
      router.refresh();
    } catch { toast.error("Шийдвэрийг хадгалж чадсангүй. Дахин оролдоно уу."); }
    finally { setBusy(false); }
  }
  return <div className="quote-decision-actions"><Button onClick={() => decide("ACCEPT")} disabled={busy}><>{busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Зөвшөөрөх</></Button><Button variant="outline" onClick={() => decide("DECLINE")} disabled={busy}><Ban /> Татгалзах</Button></div>;
}
