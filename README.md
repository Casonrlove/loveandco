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

1. Create a **new** Supabase project (do not reuse Playbook).
2. Run `supabase/migrations/20260814000001_core_store.sql`.
3. Create a **new** Vercel project and set the variables from `.env.example`.
4. Put your email in `ADMIN_EMAILS` so `/studio` is super-user only.
5. After signup, that account can open Studio from `/account`.

## Google sign-in

The login page has **Continue with Google**. Enable it in the Love & Co. Supabase project (not Playbook):

1. Create an OAuth client in Google Cloud (type: Web application).
2. Authorized JavaScript origin: `https://vouheqlstnftakhlpzmy.supabase.co`
3. Authorized redirect URI: `https://vouheqlstnftakhlpzmy.supabase.co/auth/v1/callback`
4. Supabase → Authentication → Providers → Google → enable, paste Client ID and Secret.
5. Supabase → Authentication → URL Configuration:
   - Site URL: `https://loveandco.vercel.app`
   - Redirect URLs: `https://loveandco.vercel.app/auth/callback`, `https://*.vercel.app/**`, and `http://localhost:3000/auth/callback` for local work

Sign in with `loveandcoembroidery@gmail.com` to open Studio.

Checkout is review → Venmo → produce. Production minutes only count after an order is marked paid.

## Customer emails

Studio can email the customer when you request Venmo, mark paid, start, ship, or complete an order. Shipping mail includes the tracking number if you saved one.

1. Create a [Resend](https://resend.com) account and API key.
2. Verify a domain you own (Gmail cannot be the from address).
3. In Studio → Availability, paste the key and a from address like `Love & Co. Embroidery <orders@yourdomain.com>`.
4. Send the test email, then ship an order to confirm.

## Scripts

- `npm run dev` — local app
- `npm run build` — production build
- `npm test` — scheduler tests
