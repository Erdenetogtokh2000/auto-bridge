import { getStore } from "@netlify/blobs";

type PutOptions = { httpMetadata?: { contentType?: string } };

export function getNetlifyBucket(name = "auto-bridge-files") {
  const store = getStore({ name, consistency: "strong" });
  return {
    async put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: PutOptions) {
      const blob = value instanceof Blob ? value : new Blob([await new Response(value).arrayBuffer()]);
      await store.set(key, blob, {
        metadata: { contentType: options?.httpMetadata?.contentType ?? blob.type ?? "application/octet-stream" },
      });
    },
    async get(key: string) {
      const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
      if (!result) return null;
      const metadata = (result.metadata ?? {}) as { contentType?: string };
      return {
        body: result.data,
        size: result.data.byteLength,
        httpMetadata: { contentType: metadata.contentType },
      };
    },
    async delete(key: string) {
      await store.delete(key);
    },
  };
}
