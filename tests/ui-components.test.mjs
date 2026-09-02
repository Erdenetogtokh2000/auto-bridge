import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("calculates the 30/70 split from the Korea vehicle subtotal only", async () => {
  const { calculateQuote } = await vite.ssrLoadModule("/lib/quote-calculation.ts");
  const totals = calculateQuote({
    vehiclePriceKrw: 20_000_000,
    purchaseFeeKrw: 1_000_000,
    inlandTransportKrw: 500_000,
    oceanFreightUsd: 2_000,
    krwMntRate: 2.5,
    usdMntRate: 3_500,
    customsMnt: 8_000_000,
    vatMnt: 6_000_000,
    otherCostsMnt: 1_000_000,
    depositMnt: 0,
  });

  assert.equal(totals.koreaSubtotalMnt, 53_750_000);
  assert.equal(totals.depositMnt, 16_125_000);
  assert.equal(totals.balanceMnt, 37_625_000);
  assert.equal(totals.totalMnt, 75_750_000);
});

test("keeps customs and shipping payments outside the vehicle 70 percent balance", async () => {
  const { paymentSummary } = await vite.ssrLoadModule("/lib/payment-summary.ts");
  const summary = paymentSummary(53_750_000, 16_125_000, [
    { paymentType: "DEPOSIT", status: "PAID", amountMnt: 16_125_000 },
    { paymentType: "SHIPPING", status: "PAID", amountMnt: 7_000_000 },
    { paymentType: "CUSTOMS", status: "PAID", amountMnt: 14_000_000 },
    { paymentType: "VEHICLE", status: "PAID", amountMnt: 10_000_000 },
  ]);

  assert.equal(summary.balanceMnt, 27_625_000);
  assert.equal(summary.orderStatus, "PARTIALLY_PAID");
});

test("normalizes manager permissions against the central allowlist", async () => {
  const { normalizeAdminPermissions, hasAdminPermission } = await vite.ssrLoadModule("/lib/admin-permissions.ts");
  const permissions = normalizeAdminPermissions('["QUOTES_MANAGE","ORDERS_MANAGE","QUOTES_MANAGE","NOT_A_PERMISSION"]');

  assert.deepEqual(permissions, ["QUOTES_MANAGE", "ORDERS_MANAGE"]);
  assert.equal(hasAdminPermission(permissions, "QUOTES_MANAGE"), true);
  assert.equal(hasAdminPermission(permissions, "SETTINGS_MANAGE"), false);
  assert.deepEqual(normalizeAdminPermissions("invalid-json"), []);
});

test("stores role-specific permissions and dealer acts as manager", async () => {
  const { normalizeUserProfile } = await vite.ssrLoadModule("/lib/user-profiles.ts");
  const { defaultPermissionsForRole, effectivePermissionsForRole, permissionDefinitionsForRole } = await vite.ssrLoadModule("/lib/role-permissions.ts");
  const base = { email: "manager@example.com", fullName: "Менежер", status: "ACTIVE", permissions: ["REPORTS_VIEW"], permissionsCustomized: true };

  const manager = normalizeUserProfile({ ...base, role: "DEALER" });
  const customer = normalizeUserProfile({ ...base, role: "CUSTOMER", permissions: ["CUSTOMER_QUOTES_VIEW"], permissionsCustomized: true });

  assert.equal(manager.permissions, '["REPORTS_VIEW"]');
  assert.equal(customer.permissions, '["CUSTOMER_QUOTES_VIEW"]');
  assert.equal(manager.permissionsCustomized, true);
  assert.equal(permissionDefinitionsForRole("DEALER").some(item => item.code === "REPORTS_VIEW"), true);
  assert.deepEqual(defaultPermissionsForRole("DEALER"), []);
  assert.deepEqual(effectivePermissionsForRole("CUSTOMER", "[]", false), defaultPermissionsForRole("CUSTOMER"));
  assert.deepEqual(effectivePermissionsForRole("CUSTOMER", "[]", true), []);
});
