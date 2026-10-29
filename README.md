# Quiet Web: Vercel + Supabase setup

Prepared for https://iaasjkjxdpncjklsikkm.supabase.co . No secret is included. No migration or deployment has been run against your accounts.

1. In Supabase, open the project → SQL Editor → New query. Copy the complete contents of `supabase/migrations/001_quiet_web.sql` into the editor and Run. This creates a private RLS-protected state table and a server-only atomic update function. Do not add public access policies.
2. Upload the contents of `Quiet-Web-Vercel-Source.zip` to your GitHub repository's root, replacing old copies. Keep `api/`, `lib/`, `scripts/`, `supabase/` as folders. Do not upload node_modules, data, outputs, generated public, secrets, or the old hosted-quiet-web adapter. The ZIP contains the root UI and the new Vercel backend.
3. In Vercel → Add New → Project, import `nirvanlaferrari/quiet-web`. The included vercel.json supplies the build and output settings. Framework is Other; build command is `node scripts/build-vercel.cjs`; output directory is `public`. Install dependencies normally from package-lock.json. Do not use npm start as a build command.
4. Add server environment variables in Vercel before deployment:
   - SUPABASE_URL = https://iaasjkjxdpncjklsikkm.supabase.co
   - SUPABASE_SECRET_KEY = the project's secret API key from Supabase's API keys settings. A legacy service_role key is also supported. Never use a browser-public prefix, commit the key, or paste it into chat. A publishable/anon key is not sufficient for this adapter.
5. Deploy. If environment variables are changed afterward, redeploy. Use the resulting Vercel URL for all tests. No Vercel deployment URL exists yet.
6. Verify `/api/views?feed=https%3A%2F%2Fexample.com%2Ffeed` returns JSON with count 0, not a configuration error. Import a real blog, open an article, and check the actual counter in its tooltip. Test save/read/favourites, optional ranking contributions, foreground refresh, offline save and offline reload after the service worker installs.

Architecture: Vercel serves only an allowlisted static public/ build and api/router.js. The API keeps the existing four frontend contracts and uses Supabase REST with a server-only key. server.js is imported only for shared fetching/normalization; server.listen runs only for local `node server.js` execution. There are no production filesystem writes.

The database adapter uses versioned JSONB state and compare-and-swap retries for atomic updates. This preserves the existing deduplication/ranking logic and is suitable for the hackathon's small workload. At larger scale, normalize per-pair evidence into relational rows and add database-backed network rate limits; current per-instance network limits can be bypassed by distributed traffic, and browser tokens do not prove unique people. The ranking minimum is three distinct browser tokens plus weighted support >=2.

Tests run: JavaScript syntax, frontend static build, ranking safeguards, and a mocked database concurrency-conflict test. The SQL needs execution and integration testing on your actual Supabase project. Browser QA and live Vercel deployment have not been performed. Keep the existing ChatGPT Site until the replacement passes those checks.

Local preview remains `npm.cmd install` then `npm.cmd start`; the local Node server continues using JSON files. The API database credentials are used by the Vercel adapter, not by the local file server.
