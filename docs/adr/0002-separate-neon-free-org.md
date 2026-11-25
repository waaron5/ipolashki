# Keep the database in a separate Neon Free org, created outside the Vercel Marketplace

ipolashki's Postgres lives in its own Neon organization on the Free plan. That org is separate from the owner's pay-as-you-go Neon org, and it is created in the Neon console, not through the Vercel Marketplace. Neon bills per organization, and a Free org suspends at its limits instead of charging, so this app can never add to the owner's Neon bill. A Marketplace integration would have been one click, but it creates a `Vercel: <team>` org that is billed on the Vercel invoice, and its projects can't be transferred out later.

## Consequences

- Hitting Free limits (1 GB storage, 100 CU-hours/mo, 5 GB egress/mo) suspends sync for everyone until the next period. The app keeps working on each device, so the cost is sync, not lost work.
- The `DATABASE_URL` is set by hand in Vercel project settings. It never comes from a Marketplace integration.
- Outgrowing Free is a deliberate decision: upgrade this org or move to another Postgres host. Never move the database into the owner's paid org.
