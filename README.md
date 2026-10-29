# Quiet Web

A browser-first RSS/Atom reader. Run `npm.cmd install` then `npm.cmd start`; production uses Vercel Node functions with Supabase. Set SUPABASE_URL and SUPABASE_SECRET_KEY only in the server environment. Run migrations in supabase/migrations in order. Build: `node scripts/build-vercel.cjs`.

## Browser/server boundary
All feed parsing, Readability extraction, DOMPurify sanitization and article caching run in the browser. The fetch proxy transports unparsed text and does not persist content. Supabase stores discovery aggregates, replay protection and counters, never fetched articles.

## Anonymous discovery protocol
No accounts, cookies or persistent client identifiers. Sharing defaults off. On opting in, the browser obtains a fresh signed token from GET /api/discovery/token and sends its complete list once in POST /api/discovery/submit `{feeds,token}`. Cap: 30; larger lists are rejected instead of silently sending a partial list. Tokens expire in five minutes and are consumed atomically through the existing compare-and-swap database function. They identify one request, not a browser or person. The legacy browser identifier is removed on load. Migration 002 removes old contributor-linked database evidence; this migration is required for an existing installation.

POST /api/discovery/recommendations `{feeds}` queries without contributing; GET /api/discovery/popular lists popular feeds. Both return only aggregate results. Recommendations exclude normalized followed feeds. Ranking is 70% log-scaled co-subscription support plus 30% log-scaled popularity support; at least three accepted batches and weighted support >=2 are required. Large, repetitive or hostname-concentrated lists receive less weight. Each result list includes at most two entries per hostname.

URLs normalize scheme, www, fragments, tracking parameters, slash variants, query order and common feed-path aliases. Publisher-specific aliases with no common canonical relationship cannot always be inferred without content parsing; supplying the publisher's canonical feed is preferred. DNS validation rejects local/private/reserved IPv4 and non-global IPv6 destinations. The proxy validates redirect destinations too.

## Short threat model
Defends against replayed submissions (signed single-use tokens), simple per-network floods (100 requests/minute/instance), duplicate URLs within a batch, inflated low-effort lists, ranking monopolization and fetching recognized private/local addresses. Input is bounded; the database is server-only with RLS. The rate-limit map holds only a server-salted HMAC of a minute-scoped network address with a 60-second logical expiry; raw IP addresses are never retained by application state. Hosting providers may have their own request logs; configure provider logging/retention separately.

Accepts: determined Sybil attackers can obtain fresh tokens from different network addresses; no-account/no-ID discovery cannot reliably deduplicate a returning human across batches. Popularity counts accepted anonymous list submissions, not provably unique clients. Low support produces empty aggregate results; editorial starter suggestions are labeled separately. In-memory network limits are approximate across serverless instances; they complement durable token replay protection, not replace a distributed rate limiter. DNS checks followed by standard fetch still have a DNS-rebinding TOCTOU risk; a pinned-IP transport/egress proxy is recommended before use in sensitive networks. Unusual publisher aliases may remain distinct. Infrastructure-level IP logs are outside the application's no-ID data model.

Stored discovery vote hashes are scoped to a feed pairing and single-use request nonce; they are not reusable client IDs. Replay records expire logically after five minutes and are pruned on subsequent consumption. Existing privacy-sensitive discovery data must be removed using migration 002. Do not claim this app provides cryptographic anonymity or unique-human counts.

## Checks
`npm.cmd run check`, `node scripts/test-ranking.cjs`, `node scripts/test-discovery-security.cjs`, `node scripts/test-reader-extraction.cjs`.

Deploy by uploading all source files and folders, including lib/discovery-security.cjs and the migrations. Set environment secrets directly in Vercel, never in frontend code/Git. The existing Supabase service key also acts as server-side signing salt through a domain-separated HMAC; rotating it invalidates pending tokens. No additional frontend key is required. Frontend offline caches and highlighted articles remain device-local.
