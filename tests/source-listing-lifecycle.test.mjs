import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { syncSourceListings } from "../worker/source-listing-lifecycle.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function fixture({ status = "AVAILABLE", missingAt = null, order = false, quotes = [] } = {}) {
  const row = {
    id: "VEH-11111111-1111-4111-8111-111111111111",
    listingUrl: "https://www.encar.com/dc/dc_cardetailview.do?carid=12345678",
    sourceMissingAt: missingAt,
    imageObjectKey: "vehicle-images/VEH-11111111-1111-4111-8111-111111111111/a.jpg",
    galleryImageUrls: "[]",
    status,
  };
  const deletedKeys = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) { this.args = args; return this; },
        async all() {
          if (sql.includes("FROM vehicles")) return { results: row.deleted ? [] : [row] };
          if (sql.includes("FROM quote_requests")) return { results: quotes.map(sourceUrl => ({ sourceUrl })) };
          throw Error(`Unexpected query: ${sql}`);
        },
        async first() {
          if (sql.includes("FROM orders")) return order ? { present: 1 } : null;
          throw Error(`Unexpected query: ${sql}`);
        },
        async run() {
          if (sql.includes("SET source_missing_at = NULL")) row.sourceMissingAt = null;
          else if (sql.includes("SET source_missing_at = ?")) row.sourceMissingAt = this.args[0];
          else if (sql.includes("SET status = 'ARCHIVED'")) row.status = "ARCHIVED";
          else if (sql.includes("DELETE FROM vehicles")) row.deleted = true;
          else throw Error(`Unexpected query: ${sql}`);
          return { meta: { changes: 1 } };
        },
      };
    },
  };
  return { row, db, deletedKeys, bucket: { async delete(key) { deletedKeys.push(key); } } };
}

test("temporary source failure never removes a vehicle", async () => {
  const item = fixture({ missingAt: "2026-01-01T00:00:00.000Z" });
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await syncSourceListings(item.db, item.bucket);
  assert.equal(item.row.deleted, undefined);
  assert.equal(item.row.sourceMissingAt, "2026-01-01T00:00:00.000Z");
});

test("two definite missing checks remove an unreferenced listing and its image", async () => {
  const item = fixture();
  globalThis.fetch = async () => new Response(null, { status: 404 });
  await syncSourceListings(item.db, item.bucket);
  assert.equal(item.row.deleted, undefined);
  item.row.sourceMissingAt = "2026-01-01T00:00:00.000Z";
  await syncSourceListings(item.db, item.bucket);
  assert.equal(item.row.deleted, true);
  assert.deepEqual(item.deletedKeys, [item.row.imageObjectKey]);
});

test("an order or quote preserves the vehicle record as archived", async () => {
  globalThis.fetch = async () => new Response(null, { status: 410 });
  for (const option of [
    { order: true },
    { quotes: ["https://www.encar.com/dc/dc_cardetailview.do?carid=12345678&utm_source=customer"] },
    { status: "RESERVED" },
  ]) {
    const item = fixture({ ...option, missingAt: "2026-01-01T00:00:00.000Z" });
    await syncSourceListings(item.db, item.bucket);
    assert.equal(item.row.status, "ARCHIVED");
    assert.equal(item.row.deleted, undefined);
    assert.deepEqual(item.deletedKeys, []);
  }
});
