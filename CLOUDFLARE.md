# AUTO BRIDGE on Cloudflare

The Cloudflare deployment uses Workers for the app and D1 for its relational
application data. The D1 binding is `DB`; its ID is supplied through
`CLOUDFLARE_D1_DATABASE_ID` (the default is the `auto-bridge-db` database
created for this project). Worker tracing is enabled in the generated Wrangler
configuration.

## Current migration scope

- App tables are being converted from PostgreSQL to SQLite/D1.
- Supabase Auth and Supabase Storage are still used. Moving those services is
  a separate migration and is not implied by moving the application tables.
- Creating D1 does not copy existing rows. Do not switch production traffic
  until data has been exported from Supabase, imported into D1, and verified.
- The current D1 schema contains 14 app tables. The first migration is in
  `migrations/d1/` and can be regenerated with `npm run db:generate:d1`.

## Build and deploy

The Cloudflare build generates an ignored `wrangler.jsonc` and builds the
Worker:

```sh
npm run build:cloudflare
```

Set the Cloudflare Workers Builds build variable `CLOUDFLARE_D1_DATABASE_ID`
if deploying to a different D1 database. The existing Supabase public URL and
publishable key must also be available at build time for the browser bundle.

Before deploying, apply D1 migrations to the target database:

```sh
npx wrangler d1 migrations apply auto-bridge-db --remote
```

Then deploy the Worker (the deploy script applies any pending D1 migrations
before publishing):

```sh
npm run deploy:cloudflare
```

Set runtime variables and secrets in Worker Settings → Variables and Secrets.
Keep `APIFY_TOKEN` and other credentials as secrets. Add role email lists as
plain variables. Preserve the existing production service and domain until
the D1 import and application flows are verified on the `workers.dev` URL.

## Required checks before production cutover

1. Export Supabase rows and import them into D1 with foreign-key order intact.
2. Compare row counts and key records for all 14 tables.
3. Test login, quotes, quote estimates, vehicle catalog, orders, payments,
   financing, shipment updates, and notifications.
4. Verify Supabase Auth callbacks and existing document/image links.
5. Only after those checks pass, connect `autobridge.mn` and update DNS.

## Automatic vehicle image storage

Saving a new vehicle with Encar or Cars.com image URLs copies its images to R2
automatically. The scheduled Worker also backfills existing image URLs in small
batches every 15 minutes. The admin does not need to press an R2 button. A
source that no longer serves its image, or an unsupported external image host,
cannot be copied; the original URL remains until it can be replaced.

## Move autobridge.mn from Render

`autobridge.mn` was previously configured on Render. Keep the Render DNS records
until the `workers.dev` deployment and D1 application flows are verified. When
ready, make `autobridge.mn` an active zone in the same Cloudflare account as the
Worker and remove any DNS record on that exact hostname that conflicts with a
Worker Custom Domain. Set the Cloudflare Workers Builds variable
`CLOUDFLARE_CUSTOM_DOMAIN=autobridge.mn` and trigger a new deployment. The
generated Wrangler config then registers it as a Custom Domain; Cloudflare
creates its DNS record and certificate. Verify HTTPS, login and catalog on the
new host before changing `www.autobridge.mn` or removing the Render service.
