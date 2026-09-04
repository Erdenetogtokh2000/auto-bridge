import { getSupabaseBucket } from "@/lib/supabase-bucket";

export function getDocumentBucket() {
  return getSupabaseBucket("auto-bridge-files");
}

export function safeDocumentName(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim();
  return cleaned.slice(0, 160) || "document";
}
