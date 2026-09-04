import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PutOptions = { httpMetadata?: { contentType?: string } };

async function getSupabaseStorageClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured");

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. Route handlers can.
        }
      },
    },
  });
}

export function getSupabaseBucket(name: string) {
  return {
    async put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: PutOptions) {
      const client = await getSupabaseStorageClient();
      const blob = value instanceof Blob
        ? value
        : new Blob([await new Response(value).arrayBuffer()], {
            type: options?.httpMetadata?.contentType ?? "application/octet-stream",
          });
      const { error } = await client.storage.from(name).upload(key, blob, {
        contentType: options?.httpMetadata?.contentType ?? blob.type ?? "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
    },

    async get(key: string) {
      const client = await getSupabaseStorageClient();
      const { data, error } = await client.storage.from(name).download(key);
      if (error || !data) return null;
      const body = await data.arrayBuffer();
      return {
        body,
        size: body.byteLength,
        httpMetadata: { contentType: data.type || "application/octet-stream" },
      };
    },

    async delete(key: string) {
      const client = await getSupabaseStorageClient();
      const { error } = await client.storage.from(name).remove([key]);
      if (error) throw error;
    },
  };
}
