# Run Better Auth ourselves on the app's origin, not Neon Auth

Sign-in uses the Better Auth library running in our own Vercel Function at `/api/auth`, and its user and session tables live in our Neon database. Neon Auth (managed Better Auth) is free on our plan and needs less setup code, but it serves auth from a Neon host. That means third-party cookies, which Safari blocks by default, so we'd need a proxy anyway. Every API call would also need to verify a short-lived JWT against Neon's key set. On our own origin, cookies are same-site and the API reads the session straight from the database.

## Consequences

- v1 offers Google sign-in only, with our own OAuth client. While the app lives on `*.vercel.app`, it has no domain to send email from. Email codes, and passkeys (which are bound to the domain), wait for a permanent domain.
- Better Auth's tables are owned by our Drizzle schema and migrations like every other table.
- Moving to Neon Auth later is possible, since it's the same library, but would need a user-table migration.
