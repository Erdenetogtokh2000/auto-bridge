"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Download, FileCheck2, FileText, Trash2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";

type DocumentRecord = {
  id: string;
  documentType: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  status: string;
  uploadedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  paymentId?: string | null;
};

const typeLabels: Record<string, string> = {
  INVOICE: "Нэхэмжлэх",
  EXPORT_CERTIFICATE: "Экспортын гэрчилгээ",
  BILL_OF_LADING: "Тээврийн коносамент (B/L)",
  CUSTOMS: "Гаалийн баримт",
  VEHICLE_REGISTRATION: "Автомашины гэрчилгээ",
  CONTRACT: "Гэрээ",
  OTHER: "Бусад баримт",
  PAYMENT_RECEIPT: "Төлбөрийн баримт",
};
const statusLabels: Record<string, string> = { PENDING: "ШАЛГАЖ БАЙНА", VERIFIED: "БАТАЛГААЖСАН", REJECTED: "ТАТГАЛЗСАН" };

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function DocumentManager({ orderId, documents }: { orderId: string; documents: DocumentRecord[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState("INVOICE");
  const [status, setStatus] = useState("VERIFIED");
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Хавсаргах файлаа сонгоно уу."); return; }
    const body = new FormData();
    body.set("file", file); body.set("documentType", documentType); body.set("status", status);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/documents`, { method: "POST", body });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error === "unsupported file" ? "PDF, JPG, PNG, DOC, DOCX төрлийн 10MB хүртэл файл оруулна уу." : "Баримт хадгалахад алдаа гарлаа.");
      }
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Бичиг баримт амжилттай хавсаргагдлаа.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Баримт хадгалахад алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  async function updateStatus(documentId: string, nextStatus: "VERIFIED" | "REJECTED") {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(documentId)}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Баримтын төлөв шинэчлэхэд алдаа гарлаа.");
      toast.success(nextStatus === "VERIFIED" ? "Баримт баталгаажлаа." : "Баримт татгалзсан төлөвт орлоо.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Төлөв шинэчлэхэд алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  async function remove(documentId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Баримт устгахад алдаа гарлаа.");
      toast.success("Бичиг баримт устгагдлаа.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Баримт устгахад алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  const verified = documents.filter((item) => item.status === "VERIFIED").length;
  const pending = documents.filter((item) => item.status === "PENDING").length;
  const visibleDocuments = filter === "ALL" ? documents : documents.filter((item) => item.documentType === filter);

  return <section className="admin-documents-section" id="documents">
    <div className="dashboard-section-heading document-section-title"><div><span>БИЧИГ БАРИМТ</span><h2>Файл ба баталгаажуулалт</h2></div><div className="document-counts"><span>{verified} баталгаажсан</span><span>{pending} хүлээгдэж буй</span></div></div>
    <div className="admin-document-layout">
      <section className="dashboard-panel document-upload-panel">
        <div className="panel-heading"><div><span>ШИНЭ ФАЙЛ</span><h2>Баримт хавсаргах</h2></div><UploadCloud/></div>
        <form className="document-upload-form" onSubmit={upload}>
          <label><span>Баримтын төрөл</span><Select value={documentType} onValueChange={setDocumentType}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></label>
          <label><span>Эхний төлөв</span><Select value={status} onValueChange={setStatus}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="VERIFIED">Баталгаажсан</SelectItem><SelectItem value="PENDING">Шалгаж байна</SelectItem></SelectContent></Select></label>
          <label className="document-file-input"><span>Файл сонгох</span><input ref={fileRef} type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"/><small>PDF, JPG, PNG, DOC, DOCX · 10MB хүртэл</small></label>
          <Button type="submit" disabled={busy}><UploadCloud/>{busy ? "Хадгалж байна..." : "Файл хавсаргах"}</Button>
        </form>
      </section>

      <section className="dashboard-panel document-records-panel">
        <div className="panel-heading"><div><span>ЗАХИАЛГЫН ФАЙЛ</span><h2>Бичиг баримтын жагсаалт</h2></div><div className="document-list-toolbar"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="document-filter-select"><SelectValue placeholder="Ангилал" /></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх ангилал</SelectItem>{Object.entries(typeLabels).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select><span className="live-data-chip">{documents.length} ФАЙЛ</span></div></div>
        {visibleDocuments.length ? <div className="admin-document-list">{visibleDocuments.map((item)=><article key={item.id}>
          <i className={item.status.toLowerCase()}>{item.status === "VERIFIED" ? <FileCheck2/> : item.status === "REJECTED" ? <XCircle/> : <FileText/>}</i>
          <span><strong>{item.fileName}</strong><small>{typeLabels[item.documentType] ?? item.documentType} · {formatSize(item.sizeBytes)} · {item.createdAt.slice(0,10)} · Оруулсан: {item.uploadedBy ?? "Бүртгэлгүй"}</small></span>
          <em className={item.status.toLowerCase()}>{statusLabels[item.status] ?? item.status}</em>
          <div className="document-row-actions">
            <Button asChild size="icon-sm" variant="outline"><a href={`/api/documents/${encodeURIComponent(item.id)}`} aria-label="Файл татах"><Download/></a></Button>
            {item.status !== "VERIFIED" && <Button type="button" size="icon-sm" variant="outline" disabled={busy} onClick={()=>updateStatus(item.id,"VERIFIED")} aria-label="Баталгаажуулах"><CheckCircle2/></Button>}
            {item.status !== "REJECTED" && <Button type="button" size="icon-sm" variant="outline" disabled={busy} onClick={()=>updateStatus(item.id,"REJECTED")} aria-label="Татгалзах"><XCircle/></Button>}
            <AlertDialog><AlertDialogTrigger asChild><Button type="button" size="icon-sm" variant="outline" disabled={busy} aria-label="Устгах"><Trash2/></Button></AlertDialogTrigger><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>Баримтыг устгах уу?</AlertDialogTitle><AlertDialogDescription>“{item.fileName}” файл болон бүртгэл бүрмөсөн устна.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Болих</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={()=>remove(item.id)}>Устгах</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          </div>
        </article>)}</div> : <div className="panel-empty">Энэ ангилалд бичиг баримт алга.</div>}
      </section>
    </div>
  </section>;
}
