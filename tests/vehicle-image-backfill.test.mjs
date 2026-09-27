import assert from "node:assert/strict";
import { after, test } from "node:test";
import { backfillVehicleImages } from "../worker/vehicle-image-backfill.ts";
import { storeRemoteVehicleImage } from "../lib/vehicle-catalog.ts";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test("old primary and gallery URLs are copied to R2 and replaced without a button", async () => {
  const id = "VEH-12345678-1234-1234-1234-123456789abc";
  const row = {
    id, imageUrl: "https://ci.encar.com/primary.jpg", imageObjectKey: null,
    galleryImageUrls: JSON.stringify(["https://ci.encar.com/primary.jpg", "https://ci.encar.com/other.jpg"]),
  };
  const objects = new Map();
  globalThis.fetch = async () => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), { status: 200 });
  const db = {
    prepare(sql) {
      return {
        all: async () => ({ results: [structuredClone(row)] }),
        bind(...args) {
          return {
            async run() {
              if (sql.includes("SET image_object_key")) {
                const [key, gallery, , vehicleId, previousUrl, previousGallery] = args;
                if (vehicleId !== row.id || row.imageObjectKey || row.imageUrl !== previousUrl || row.galleryImageUrls !== previousGallery)
                  return { meta: { changes: 0 } };
                row.imageObjectKey = key; row.imageUrl = null; row.galleryImageUrls = gallery;
              } else {
                const [gallery, , vehicleId, previousGallery] = args;
                if (vehicleId !== row.id || row.galleryImageUrls !== previousGallery) return { meta: { changes: 0 } };
                row.galleryImageUrls = gallery;
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  const bucket = {
    async put(key, bytes) { objects.set(key, bytes); },
    async delete(key) { objects.delete(key); },
  };
  await backfillVehicleImages(db, bucket);
  assert.equal(objects.size, 2);
  assert.ok(row.imageObjectKey.startsWith(`vehicle-images/${id}/`));
  assert.equal(row.imageUrl, null);
  const gallery = JSON.parse(row.galleryImageUrls);
  assert.equal(gallery[0], `/api/vehicle-images/${id}`);
  assert.match(gallery[1], new RegExp(`^/api/vehicle-images/${id}\\?image=`));
});

test("trusted CDN redirect is followed and the image is stored", async () => {
  const seen = [];
  globalThis.fetch = async url => {
    seen.push(String(url));
    return seen.length === 1
      ? new Response(null, { status: 302, headers: { location: "/resolved.jpg" } })
      : new Response(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), { status: 200 });
  };
  let stored = false;
  await storeRemoteVehicleImage("VEH-123", "https://ci.encar.com/original.jpg", async () => { stored = true; });
  assert.deepEqual(seen, ["https://ci.encar.com/original.jpg", "https://ci.encar.com/resolved.jpg"]);
  assert.equal(stored, true);
});

test("redirect to an untrusted host is blocked", async () => {
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "https://example.com/image.jpg" } });
  await assert.rejects(
    storeRemoteVehicleImage("VEH-123", "https://ci.encar.com/original.jpg", async () => { throw new Error("must not store"); }),
    /IMAGE_REDIRECT_UNTRUSTED_HOST example\.com/,
  );
});
