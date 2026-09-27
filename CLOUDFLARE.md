# AUTO BRIDGE Cloudflare migration

This deploys the Next.js app and API routes to Cloudflare Workers with Vinext.
The existing Supabase PostgreSQL, Auth and Storage remain in place; no data
copy or schema reset is part of this deployment.

Workers tracing is enabled for request and runtime visibility. The current
Auto Bridge code is a web application, not a Cloudflare Agent/AI SDK workflow,
so it will not appear as an agent session until agent calls are added and
instrumented with a supported Cloudflare integration.

## Before deploying

1. In Cloudflare Hyperdrive, create a configuration for the **direct** Supabase
   PostgreSQL connection string. Hyperdrive handles pooling. Copy its ID.
2. Make sure the Cloudflare account has Workers Images transformations enabled
   for the `IMAGES` binding used by the existing image route.
3. Configure the Worker runtime values in Cloudflare: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAILS`, `MANAGER_EMAILS`,
   `FINANCE_EMAILS`, `TRANSPORT_EMAILS`, `CUSTOMER_EMAILS`, and `APIFY_TOKEN`
   if vehicle import uses it. The Supabase URL and publishable key must also
   be present **at build time** so browser code has the correct values.
   Do not place the database password, service role key, or API tokens in Git.
4. In Supabase Auth URL configuration, add the preview `*.workers.dev` origin
   and later `https://autobridge.mn` to the allowed redirect URLs, matching the
   app's `/auth/callback` flow. Preserve the current production values.

## Build and preview

Set `CLOUDFLARE_HYPERDRIVE_ID` and `CLOUDFLARE_ACCOUNT_ID` in the deployment
environment, then run `npm ci` and `npm run build:cloudflare`. This generates an
ignored `wrangler.jsonc` with the Hyperdrive binding and builds the Worker.
Deploy first to its Workers preview URL with `npm run deploy:cloudflare`.

Check the home page, vehicle list, quote submission, customer login, role
permissions, order and payment views, and upload/download before connecting
the domain. Once verified, attach `autobridge.mn` and `www.autobridge.mn` to the
Worker in Cloudflare and update DNS there. Keep the existing Render service
until the live domain and the Supabase callback flow pass those checks.
