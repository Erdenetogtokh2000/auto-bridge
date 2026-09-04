import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const text = async (relative) => readFile(path.join(root, relative), "utf8");

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "build"].includes(entry.name)) continue;
      result.push(...await collectSourceFiles(absolute));
    } else if (/\.(?:ts|tsx|js|mjs|css)$/.test(entry.name)) {
      result.push(absolute);
    }
  }
  return result;
}

test("keeps all critical production routes and workflows present", async () => {
  const critical = [
    "app/page.tsx",
    "app/login/page.tsx",
    "app/forgot-password/page.tsx",
    "app/reset-password/page.tsx",
    "app/calculator/page.tsx",
    "app/vehicles/page.tsx",
    "app/vehicles/[id]/page.tsx",
    "app/expo/page.tsx",
    "app/request-quote/page.tsx",
    "app/request-received/page.tsx",
    "app/admin/page.tsx",
    "app/portal/page.tsx",
    "app/transport/page.tsx",
    "app/finance/page.tsx",
    "app/api/quotes/route.ts",
    "app/api/encar/resolve/route.ts",
    "app/components/dashboard-shell.tsx",
    "app/components/brand-logo.tsx",
  ];
  await Promise.all(critical.map((relative) => access(path.join(root, relative))));
});

test("keeps Quick Quote and calculator quote submission on the production API", async () => {
  const quickQuote = await text("app/components/encar-quick-quote.tsx");
  const quoteForm = await text("app/components/public-quote-request-form.tsx");
  const quoteRoute = await text("app/api/quotes/route.ts");
  assert.match(quickQuote, /action="\/api\/quotes"/);
  assert.match(quoteForm, /action="\/api\/quotes"/);
  assert.match(quoteRoute, /\/request-received\?ref=/);
});

test("does not introduce production-facing localhost:10000 URLs", async () => {
  const directories = ["app", "lib", "db"].map((relative) => path.join(root, relative));
  const files = (await Promise.all(directories.map(collectSourceFiles))).flat();
  const offenders = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (content.includes("localhost:10000")) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(offenders, []);
});

test("keeps existing customs, VAT and 30/70 calculation rules intact", async () => {
  const taxes = await text("lib/vehicle-import-taxes.ts");
  const quoteCalculation = await text("lib/quote-calculation.ts");
  assert.match(taxes, /CUSTOMS_DUTY_RATE\s*=\s*0\.05/);
  assert.match(taxes, /VAT_RATE\s*=\s*0\.10/);
  assert.match(quoteCalculation, /0\.3/);
  assert.match(quoteCalculation, /0\.7/);
});

test("keeps role routing and authentication implementation in place", async () => {
  const auth = await text("app/chatgpt-auth.ts");
  const login = await text("app/components/netlify-login-form.tsx");
  const forgot = await text("app/forgot-password/page.tsx");
  for (const role of ["ADMIN", "CUSTOMER", "TRANSPORT", "FINANCE"]) assert.match(auth, new RegExp(role));
  assert.match(login, /signInWithPassword/);
  assert.match(login, /signUp/);
  assert.match(forgot, /resetPasswordForEmail/);
});

test("loads the global sourcing presentation without replacing core quote and calculator components", async () => {
  const layout = await text("app/layout.tsx");
  const home = await text("app/page.tsx");
  const hero = await text("app/components/home-hero-carousel.tsx");
  assert.match(layout, /global-sourcing-redesign\.css/);
  assert.match(layout, /global-sourcing-detail\.css/);
  assert.match(hero, /GLOBAL AUTOMOTIVE SOURCING/);
  assert.match(hero, /Таны сонголт\. Дэлхийн зах зээл\./);
  assert.match(home, /EncarQuickQuote/);
  assert.match(home, /PublicCostCalculator/);
});
