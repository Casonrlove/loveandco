# Love & Co. Embroidery

Next.js storefront and studio for Anna’s custom embroidery shop.

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase, marketing pages, the shop, and `/studio` use a local `.data/store.json` preview store. Add products in Studio; empty categories stay hidden on the public shop.

## Production

1. Restore Love & Co. project `vouheqlstnftakhlpzmy` in Playbook; keep it separate from PlanWell.
2. Apply **all** files in `supabase/migrations` in timestamp order. For an existing database, apply only pending migrations. The checkout code requires `20260906000002_atomic_checkout.sql` before deployment.
3. Use the Love & Co. Vercel project and verify the variables from `.env.example`.
4. Put your email in `ADMIN_EMAILS` so `/studio` is super-user only.
5. After signup, that account can open Studio from `/account`.

## Google sign-in

The login page has **Continue with Google**. Enable it in the Love & Co. Supabase project:

1. Create an OAuth client in Google Cloud (type: Web application).
2. Authorized JavaScript origin: `https://vouheqlstnftakhlpzmy.supabase.co`
3. Authorized redirect URI: `https://vouheqlstnftakhlpzmy.supabase.co/auth/v1/callback`
4. Supabase → Authentication → Providers → Google → enable, paste Client ID and Secret.
5. Supabase → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (later the live domain)
   - Redirect URLs: `http://localhost:3000/auth/callback` and the production callback

Sign in with `loveandcoembroidery@gmail.com` to open Studio.

Checkout is review → Venmo → produce. Production minutes only count after an order is marked paid.

## Scripts

- `npm run dev` — local app
- `npm run build` — generate image assets, then build the production app (storefront delivery currently uses original photos)
- `npm test` — pricing, validation, scheduling, and PostgreSQL security regression tests
- `npm run lint` — Next.js and React lint checks
- `npm run images` — regenerate static image assets after changing originals

## Public caching and hosting usage

Marketing and shop pages use incremental static regeneration. Public turnaround data refreshes after 5 minutes, the catalog after 15 minutes, and the Instagram feed after 1 hour. Studio changes invalidate the relevant cache. Account, checkout, auth, and Studio requests stay dynamic; no private data is put in shared caches. Public pages do not run the auth proxy.

`predev` and `prebuild` generate `public/media` and `lib/generated-images.json` from the original photos. These generated artifacts are ignored by Git. Use the npm scripts rather than calling `next build` directly. Images have content-hashed URLs, responsive widths, and long cache lifetimes; no Vercel image transformations are needed. An unreadable, unused original (`Baby_5.png`, actually HEIC) is skipped with a warning.

See [AUDIT.md](AUDIT.md) for security findings, validation, and remaining live checks.

## Restore the Marketplace database

The existing Love & Co. project is `vouheqlstnftakhlpzmy` in the **Playbook** organization. Open the Playbook Vercel team → Storage → loveandco → Open in Supabase → Restore project. A restore does not apply pending code migrations. Do not link this repository to PlanWell’s database.

After restoration, run the pending migrations, then `supabase/audit.sql` in the correct project's SQL Editor. Rotate any Instagram token that was stored while public settings reads were allowed. Verify Auth redirect URLs, email confirmation, storage policies, and production API abuse protection before signing off the live deployment.

## Studio operations

See [STUDIO.md](STUDIO.md) for the expanded order workbench, inquiry inbox, customer history, product editing, and website controls. Apply pending migration `20260906000003_studio_operations.sql` before deploying this version.

The full operations upgrade also requires `20260906000004_complete_operations.sql`: durable abuse controls, checkout retries, proofs, inventory, history, delivery, galleries, and editable shop information. Product uploads provision the public `product-photos` bucket on first upload. See [STUDIO.md](STUDIO.md).

Live database update (September 6, 2026): all repository migrations are applied to Love & Co. `vouheqlstnftakhlpzmy`, and post-migration permission checks passed. No browser SQL steps remain for these migrations. The website release is deployed to https://loveandco.vercel.app.
