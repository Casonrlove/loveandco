# Love & Co. capacity and upgrade plan

Last reviewed: August 14, 2026.

This shop is a low-traffic made-to-order store. An **active customer** is someone who visits a few times around an order. These are planning limits, not vendor guarantees.

## What will not be the first limit

Function count and database size will stay tiny at embroidery-shop volume. Hundreds of page views and a handful of order posts per week are well inside Vercel Hobby and Supabase Free numeric quotas.

## What actually matters

| Concern | Why | Action |
|---|---|---|
| Vercel Hobby commercial-use rule | Hobby is personal / non-commercial. A live shop that takes money is commercial. | Use **Vercel Pro (~$20/mo)** before this is the public store taking payment. Usage is not the trigger. |
| Product images | Supabase Free is 1 GB storage and 5 GB egress. | Keep photos in `public/images` on Vercel. Do not put the catalog in Supabase Storage. |
| Order email | Resend trial senders are rate-limited. | Verify the shop domain before relying on order mail. |
| Supabase Free | 500 MB database, 50k MAU | Plenty for years of orders. Upgrade only if backups/support start to matter. |

## Recommended setup

- **New Vercel project** (not Playbook).
- **New Supabase project** (not Playbook’s database or users).
- Hobby is fine while building. Move to Pro when the domain is live and Venmo payments are flowing.
- Shopify is not required. Pro + Supabase Free is still cheaper than Shopify Basic.

## Upgrade order

1. **Vercel Pro** when this site is commercially live.
2. **Resend domain** before customer-facing status email matters.
3. **Supabase Pro** only if you need better backups or you outgrow 500 MB (unlikely).
