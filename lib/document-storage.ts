import { env } from "cloudflare:workers";

export function getDocumentBucket(): R2Bucket {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket) throw new Error("Cloudflare R2 binding `BUCKET` is unavailable.");
  return bucket;
}

export function safeDocumentName(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim();
  return cleaned.slice(0, 160) || "document";
}
