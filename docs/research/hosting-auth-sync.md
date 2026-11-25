# Research: hosting, auth & sync at near-zero cost

Answers [issue #8](https://github.com/waaron5/ipolashki/issues/8) (map: [#1](https://github.com/waaron5/ipolashki/issues/1)).
All sources were read on **2026-11-25**. Pricing changes often, so check the linked pages again before you commit to anything.

## The question, restated

ipolashki must work fully signed-out (Designs, Pieces and Palettes kept locally, e.g. in IndexedDB). Signing in adds sync of those across one user's own devices: last-edit-wins per Design with a conflict warning, and no real-time collaboration. Tracing images are user-uploaded binaries. The owner pays for Vercel Pro, has a pay-as-you-go Neon account that this app must not add usage to, and is happy to use free tiers. Every user gets hard limits.

## TL;DR

1. **No sync engine is needed.** "Last edit wins per Design, warn on conflict, no real-time" amounts to a versioned document store: each Design is one JSON row with a `version`, and the client sends `baseVersion` on save. A mismatch is a conflict. A small API on Vercel Functions covers this. Every hosted local-first engine looked at either has a free tier too small for a public app, needs extra infrastructure, or is being wound down (see [Sync engines](#local-first-sync-engines)).
2. **Vercel Pro is not "free" capacity.** It's a **$20/month usage credit shared across all the owner's Pro projects**, plus 1M CDN requests and 1 TB transfer through Flat Rate CDN. Functions and Blob on Pro have **no free allowance of their own**: they draw down the credit, then bill on demand. ipolashki's likely usage costs cents, but it competes with the owner's other projects for that $20. Set a Spend Management cap.
3. **A separate Neon Free organization does isolate billing.** Neon bills **per organization**, and Free orgs *suspend* rather than charge at their limits. Neon Free now also includes **managed Better Auth (60k MAU per project)** and **5 GB of S3-compatible Object Storage per project**. Postgres, auth and tracing-image storage can all live in one $0 org that is walled off from the owner's paid org.

## Recommended stacks

### A. Vercel Functions + Neon Free org (Postgres + Neon Auth) + Vercel Blob — *recommended*

- **Hosting/API:** Next.js (or Vite plus `/api` functions) on the owner's Vercel Pro team. The sync API is about 3 routes: list changed Designs since a cursor, upsert with `baseVersion`, and delete (tombstone).
- **DB:** Postgres in a **new Neon organization on the Free plan**, either created directly in the Neon console or via the Vercel Marketplace with the Free plan. Designs, Pieces and Palettes are stored as `jsonb` rows keyed by `(user_id, id)` with `version` and `updated_at`.
- **Auth:** Neon Auth (managed Better Auth, writes to the `neon_auth` schema in the same DB), or self-hosted Better Auth (MIT) on the same Postgres. Both have no per-MAU fee.
- **Tracing images:** Vercel Blob, **private** store, using client uploads (browser → Blob directly, so no 4.5 MB function body limit and no upload transfer charge).
- **Cost:** $0 on Neon, which is capped and suspends instead of billing. Vercel usage comes out of the existing $20 credit.
- **Cost cliffs:** (1) Neon Free per project: **1 GB Postgres, 100 CU-hours/month, 5 GB egress/month**. At those limits writes fail or compute suspends until next month, which is graceful but is an outage for sync. (2) Once the owner's $20 Vercel credit is used up, Blob and Functions bill on demand: Blob storage $0.023/GB-month, functions $0.60/1M invocations plus CPU/memory.
- **Lock-in/exit:** Low. It's plain Postgres (`pg_dump`), and Better Auth is an open-source library whose tables you own. Blob is a plain object store, and the `@vercel/blob` calls sit behind one module.
- **Trade-off:** You write the sync API and quota logic yourself (small), and two vendors are involved.

### B. Same as A, but tracing images in Neon Object Storage instead of Vercel Blob

- Uses the Free org's **5 GB S3-compatible Object Storage**, so binaries also cost $0 and never touch the Vercel credit.
- **Caveat:** It's new (Neon "backend" GA blog dated 2026-09-17), and its **5 GB egress allowance is shared with Postgres and Functions in the same project**. Every time a Tracing image is viewed on a new device, that egress is spent. Per-object limits and presigned-upload docs weren't found. Do a quick prototype before committing.
- Lock-in is low because it speaks the standard S3 API, so moving to R2 or Vercel Blob is a config change.

### C. Supabase Free (Postgres + Auth + Storage, all in one)

- **Free:** 500 MB DB, **50k MAU** auth, **1 GB file storage, 50 MB max file**, 5 GB egress, **2 free projects per user**, a separate org (Supabase also bills per organization). Row Level Security gives per-user isolation without writing an API, since the client talks to PostgREST directly.
- **Cost cliffs:** Free projects **pause after 1 week of inactivity**. Going over quota triggers a grace period, then restrictions (read-only DB, paused project, or 402s for the whole org). The next step up is Pro at **$25/month**.
- **Lock-in:** Medium. Postgres and Storage are portable, but RLS policies, Supabase Auth's `auth.users` and the client SDK are Supabase-shaped.
- **Trade-off:** Fastest to build, but the smallest DB/storage, and the inactivity pause hurts a hobby-scale app. It also doesn't use the Vercel Pro the owner already pays for (other than hosting the static app).

**Considered and not recommended as primary:** Cloudflare Workers + D1 + R2 is the most generous free tier (R2 10 GB with **free egress**, D1 5 GB, hard daily caps that error rather than bill). But it moves the API off Vercel into a second platform, and the Workers Free CPU limit is 10 ms per invocation. **R2 alone** is a good drop-in for Tracing images if Blob costs ever matter (S3 API, presigned PUT URLs). **Turso Free** (5 GB, 500M row reads/month, 100 DBs) is a strong alternative to Neon for stack A if SQLite/libSQL is preferred.

## Per-user storage caps: how each option enforces them

None of the providers offers a native per-end-user quota. In every stack the **app enforces it**:

- **Design/Piece/Palette data (all stacks):** keep a `user_usage(user_id, doc_count, doc_bytes, blob_bytes)` row. Update it in the **same transaction** as each upsert (`octet_length(doc::text)` delta). Reject with 413/422 if the result would exceed caps such as max Designs, max bytes per Design, and max total bytes. In Supabase this goes in a `security definer` function or trigger, because RLS alone can't sum.
- **Vercel Blob:** in `handleUpload` → `onBeforeGenerateToken`, authenticate, read `blob_bytes`, and return `maximumSizeInBytes = min(perFileCap, quota − used)`, plus `allowedContentTypes: ['image/*']` and a `users/<id>/` pathname. Record the real size in `onUploadCompleted`, which receives `blob.size` and your `tokenPayload`. Reconcile periodically with `list({ prefix: 'users/<id>/' })`, which returns `size` per blob. Note that `onUploadCompleted` can't reach localhost (use a tunnel in dev). ([client uploads](https://vercel.com/docs/vercel-blob/client-upload), [SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk))
- **S3-style stores (R2, Neon Object Storage):** issue presigned PUT URLs from the API only after the same quota check, signing `Content-Length`/`Content-Type`. Record the size on completion.
- **Supabase Storage:** per-bucket `file_size_limit` (≤ 50 MB on Free) and allowed MIME types. Per-user totals need a policy or trigger that sums `storage.objects.metadata->>'size'` for the user's folder.
- **Client-side first:** downscale/re-encode Tracing images before upload (e.g. long edge ≤ 2048 px, WebP). This saves quota and transfer everywhere.
- **Global backstops:** Vercel Spend Management (notify, webhook, or **pause projects** at a $ amount; the default is a notification at $200), and the Free-plan hard caps at Neon/Supabase/Cloudflare, which suspend rather than bill.

## Findings by service (with sources)

### Vercel Pro: what's actually included

- Pro platform fee **$20/month includes $20 usage credit**, usable across all managed-infrastructure resources "from the first unit you use". The credit expires monthly. Past it, usage is billed on demand. Alerts fire at 75% of the credit. Spend-management notifications default to **$200/cycle**. ([Pro plan](https://vercel.com/docs/plans/pro-plan))
- **Flat Rate CDN:** Pro includes the lowest tier at no extra cost: **1M CDN requests + 1 TB data transfer/month**. It covers CDN requests, Fast Data Transfer **and Blob Data Transfer**. Exceeding it moves you to a higher tier ($20/month for 10M requests) from the next cycle. ([Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn)) *Discrepancy:* the marketing [pricing page](https://vercel.com/pricing) says "10M CDN requests" for Pro, while both docs pages say 1M. Treat 1M as the safe figure.
- **Functions (Fluid compute):** "Pro doesn't include allowances for Active CPU, Provisioned Memory, or Invocations. Vercel bills them on demand, and your monthly Pro usage credit can offset those charges." Invocations cost $0.60/1M, Active CPU from $0.128/h, Provisioned Memory from $0.0106/GB-h (iad1). Hobby gets 1M invocations / 4 CPU-h / 360 GB-h free, but Hobby is not the owner's plan. ([Functions pricing](https://vercel.com/docs/functions/usage-and-pricing))
- **Blob:** Pro is "Usage-based", with no included quota, paid from the monthly credit. Storage $0.023/GB-month, simple ops $0.35–0.40/1M, advanced ops (uploads, lists) $4.50–5.00/1M. Upload via client uploads incurs no transfer charge. Private and public stores cost the same to store, but private delivery streams through a Function (more transfer). Max file 5 TB, and Pro rate limit is 75 advanced ops/s. ([Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing))
- **Edge Config is now "Global Config"**: for flags and redirects, "data that you read often and update rarely". Not suitable for user data. Pro reads cost $3/1M, writes $1/100. ([Global Config](https://vercel.com/docs/global-config), [pricing](https://vercel.com/pricing))
- **Marketplace storage (Neon, Supabase, Upstash, etc.):** "Unified billing: Pay for storage resources through your Vercel account." `vercel install neon --billing-plan free` exists, so provider free plans can be picked. ([Marketplace storage](https://vercel.com/docs/marketplace-storage)) Marketplace DBs are **billed by the provider's plan via the Vercel invoice**. They are **not** covered by the Pro $20 credit (that covers "managed infrastructure" resources only), though this was inferred rather than stated outright.

**Rough usage for ipolashki**, an illustrative estimate rather than a quote: 1,000 signed-in users × 500 sync calls/month = 0.5M invocations ≈ $0.30 plus a few cents of CPU. 1,000 users × 25 MB of Tracing images = 25 GB ≈ $0.58/month of Blob storage. That is well inside $20, *if* the owner's other projects aren't already using the credit.

### Neon: does a separate Free org isolate billing?

- **Yes.** "Plans apply per organization", and billing is per organization. One account can belong to several orgs on different plans. The plans page refers to "another Free organization" and notes you can't transfer a project from a Launch org into a Free one. ([Pricing](https://neon.com/pricing), [Plans](https://neon.com/docs/introduction/plans)) No cap on the number of Free orgs per account was found. Confirm in the console when creating it.
- **Free plan (per project):** 100 projects, 10 branches, **100 CU-hours/month**, autoscale to 2 CU, scale-to-zero after 5 min (can't be disabled), **1 GB Postgres storage per project (20 GB across all Free projects)**, **5 GB public egress/month**, 6 h restore window. **Managed Better Auth up to 60k MAU per project** (auth rows live in your DB's `neon_auth` schema and count toward the 1 GB). **5 GB Object Storage**, **1M Functions invocations**. ([Pricing](https://neon.com/pricing), [Free plan FAQ, updated 2026-11-03](https://neon.com/faqs/free-plan-limits-and-quotas), [Managed Better Auth](https://neon.com/docs/auth/about), [Neon backend GA blog](https://neon.com/blog/neon-backend-is-ga))
- **At the limits it suspends, it doesn't charge:** CU-hours exhausted means compute is suspended until the next period. Egress exhausted means Postgres, Object Storage and Functions are restricted. Storage cap reached means writes fail while reads and `pg_dump` still work. No data is deleted. ([Plans](https://neon.com/docs/introduction/plans))
- **Via the Vercel Marketplace:** creates a **new org named `Vercel: <team-name>`** in your Neon account, **billed through Vercel**, separate from existing Neon orgs. Projects can't be transferred out of a Vercel-managed org (exit means copying data). ([Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration)) A **Neon-managed Free org created directly in the Neon console** is the cleaner choice. It is easier to exit, and an accidental upgrade can't land on the Vercel invoice.
- Launch (pay-as-you-go) for reference: $0.106/CU-h, $0.35/GB-month, no minimum. This is the owner's existing plan, which this app must avoid.

### Other databases

| Option | Free limits | At the limit | Next step |
|---|---|---|---|
| **Supabase Free** ([pricing](https://supabase.com/pricing), [billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [FAQ](https://supabase.com/docs/guides/platform/billing-faq)) | 500 MB DB, 50k MAU, 1 GB storage, 50 MB/file, 5 GB egress, 2 free projects total, pause after 1 week idle | Grace period, then read-only / pause / 402 for the whole org | Pro from $25/month |
| **Turso Free** ([pricing](https://turso.tech/pricing)) | 100 DBs, 5 GB, 500M rows read, 10M rows written, 3 GB syncs/month | Not stated | Developer $4.99/month |
| **Cloudflare D1** ([pricing](https://developers.cloudflare.com/d1/platform/pricing/)) | 5M rows read/day, 100k written/day, 5 GB total, 10 DBs | Queries error until 00:00 UTC; storage full blocks writes | Workers Paid $5/month |
| **Firebase Spark** ([pricing](https://firebase.google.com/pricing)) | Firestore 1 GiB, 50k reads / 20k writes per day, Auth 50k MAU | Not stated | Blaze (pay-as-you-go). **Cloud Storage is not available on Spark**, so Tracing images force Blaze. |

### Blob stores

| Option | Free | Paid | Notes |
|---|---|---|---|
| **Vercel Blob** (Pro) | None. Uses the $20 credit; transfer covered by Flat Rate CDN 1 TB | $0.023/GB-month, ops $0.35–5/1M | Private stores, client uploads, `maximumSizeInBytes`. ([docs](https://vercel.com/docs/vercel-blob/usage-and-pricing)) |
| **Cloudflare R2** | 10 GB-month, 1M Class A, 10M Class B, **egress free** | $0.015/GB-month | S3 API. Page updated 2026-10-30. Whether a card on file is needed wasn't confirmed. ([pricing](https://developers.cloudflare.com/r2/pricing/)) |
| **Neon Object Storage** | 5 GB/project (egress shared, 5 GB) | $0.023/GB-month, no request fee | New, S3-compatible. ([pricing](https://neon.com/pricing)) |
| **Supabase Storage** | 1 GB, 50 MB/file | Pro plan | RLS on `storage.objects`. |

### Auth

| Option | Cost | Notes |
|---|---|---|
| **Better Auth** (self-hosted library) | $0, MIT | Runs in your Vercel functions against your own DB, so you own the tables. ([repo](https://github.com/better-auth/better-auth)) |
| **Auth.js** | $0 | "The Auth.js project is now part of Better Auth." Pick Better Auth for new work. ([authjs.dev](https://authjs.dev/)) |
| **Neon Auth** | Free ≤ 60k MAU per project | Managed Better Auth, data in your Neon DB (`neon_auth` schema), AWS regions only. ([docs](https://neon.com/docs/auth/about)) |
| **Clerk** Hobby | Free ≤ 50k MRU per app (users counted only if they return 24 h+ after sign-up) | No passkeys/MFA, forced Clerk branding, 7-day sessions, ≤3 social providers. Pro is $25/month + $0.02/MRU. User data lives at Clerk (higher exit cost). ([pricing](https://clerk.com/pricing)) |
| **Supabase Auth** | Free ≤ 50k MAU | Tied to the Supabase project. |
| **Firebase Auth** | Free ≤ 50k MAU on Spark | Tied to Firebase. |

### Local-first sync engines

None is a good fit. The sync requirement is coarse (whole-Design LWW plus a conflict warning), and each engine either costs money at public-app scale, needs infrastructure the app wouldn't otherwise run, or carries continuity risk.

| Engine | Free / cost | Why not (for ipolashki) |
|---|---|---|
| **Dexie Cloud** ([pricing](https://dexie.org/cloud/pricing)) | Free: **3 production users**, 100 MB. Pro €0.12/user/month. Self-host licence €3,495 one-off | Free tier is useless for a public app, and cost scales per user. *Pairs well with Dexie as the local IndexedDB layer, though.* |
| **InstantDB** ([announcement](https://instantdb.com/essays/instant_team_joins_openai)) | Team joined OpenAI (announced Aug 2026). **New Cloud signups closed. All Cloud apps shut down 2027-08-31**, backups kept to 2028-08-31. Open source, self-hostable | Hosted option is gone. |
| **Triplit** ([Supabase blog, 2025-10-08](https://supabase.com/blog/triplit-joins-supabase)) | Team joined Supabase. AGPL-3.0 | Uncertain hosted future. Copyleft. |
| **PowerSync** ([pricing](https://www.powersync.com/pricing)) | Free: 2 GB synced/month, 500 MB hosted, 50 peak connections, **deactivated after 1 week idle**. Pro from $49/month. Self-host Open Edition | Needs your own Postgres too, and the next step costs $49. |
| **Zero (Rocicorp)** ([docs](https://zero.rocicorp.dev/docs/open-source)) | Apache-2.0. Cloud Zero is paid (price not listed). Self-host `zero-cache` | Needs Postgres logical replication plus a long-running `zero-cache` server, which doesn't fit serverless-only. Offline writes not documented. |
| **Electric** ([pricing](https://electric.ax/pricing)) | Pay-as-you-go $1/1M writes + $0.10/GB-month, **bills under $5/month waived**, +$2/1M for Postgres Sync. Apache-2.0 | Product has pivoted to "durable streams". More moving parts than needed. |
| **Convex** ([pricing](https://www.convex.dev/pricing), [self-host](https://docs.convex.dev/self-hosting)) | Free: 1M function calls, 0.5 GB DB, 1 GB files, 1 GB egress. FSL-Apache licence | Not local-first (no offline story documented). Proprietary data model means high exit cost. |
| **Jazz** ([pricing via search](https://jazz.tools/pricing)) | Reported: Starter free 10 GB storage, 100 MAU. Indie $4/month for 10k MAU | Page returned 404 when fetched, so figures are unverified. 100 MAU is too small. CRDT model is more than LWW needs. |

## What this means for other tickets

- **Signed-out and offline behavior / file format:** choose the local store (plain IndexedDB, or Dexie as a wrapper) with a schema that already carries `id`, `version`, `updatedAt` and `deletedAt` per Design, Piece and Palette, so sync becomes "push dirty rows, pull since cursor".
- **Tracing images:** store them locally as Blobs in IndexedDB. Sync them as content-addressed objects (hash as the key), uploaded once and referenced from the Design JSON. Downscale on import.
- **Per-user limits** need concrete numbers decided, e.g. N Designs, X MB of Design data, Y MB of Tracing images, Z MB per file.

## Open questions / not verified

- Whether the Vercel Pro $20 credit covers Marketplace-billed resources. The docs say the credit covers "managed infrastructure billable resources", which reads as **no**.
- Whether Neon caps how many Free orgs one account may own (no cap found).
- Whether Cloudflare R2's free tier needs a payment method on file.
- Neon Object Storage per-object limits and presigned-upload support.
- The Vercel pricing page (10M) and docs (1M) disagree on included CDN requests.
