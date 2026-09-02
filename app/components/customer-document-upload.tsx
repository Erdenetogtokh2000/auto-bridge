"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

const types = {
  VEHICLE_REGISTRATION: "Автомашины гэрчилгээ",
  CONTRACT: "Гэрээ",
  CUSTOMS: "Гаалийн баримт",
  OTHER: "Бусад баримт",
};

export function CustomerDocumentUpload({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<keyof typeof types>("VEHICLE_REGISTRATION");
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Хавсаргах файлаа сонгоно уу."); return; }
    const body = new FormData();
    body.set("file", file);
    body.set("documentType", documentType);
    setBusy(true);
    try {
      const response = await fetch(`/api/portal/orders/${encodeURIComponent(orderId)}/documents`, { method: "POST", body });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error === "unsupported file" ? "PDF, JPG, PNG, DOC, DOCX төрлийн 10MB хүртэл файл оруулна уу." : "Баримт илгээхэд алдаа гарлаа.");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Баримт амжилттай илгээгдлээ. Админ шалгасны дараа харагдана.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Баримт илгээхэд алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  return <section className="customer-document-upload">
    <div><strong>Өөрийн баримт хавсаргах</strong><small>Илгээсэн баримт админ шалгасны дараа баталгаажна.</small></div>
    <form onSubmit={upload}>
      <Select value={documentType} onValueChange={(value) => setDocumentType(value as keyof typeof types)}>
        <SelectTrigger className="payment-select"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(types).map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
      <label className="customer-document-file"><input ref={fileRef} type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /><span>PDF, JPG, PNG, DOC, DOCX · 10MB хүртэл</span></label>
      <Button type="submit" disabled={busy}><UploadCloud />{busy ? "Илгээж байна..." : "Баримт илгээх"}</Button>
    </form>
  </section>;
}
