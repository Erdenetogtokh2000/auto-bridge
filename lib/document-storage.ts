import { getNetlifyBucket } from "@/lib/netlify-bucket";

export function getDocumentBucket() {
  return getNetlifyBucket();
}

export function safeDocumentName(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim();
  return cleaned.slice(0, 160) || "document";
}
