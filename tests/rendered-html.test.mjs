import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bundles AUTO BRIDGE production metadata", async () => {
  const serverBundle = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.match(serverBundle, /title:\s*["']AUTO BRIDGE["']/);
  assert.doesNotMatch(serverBundle, /codex-preview/);
});
