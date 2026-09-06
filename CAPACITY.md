# Hosting usage and capacity

Reviewed September 6, 2026. No hosting plan changes were made. These are implementation measurements, not a billing forecast.

## Reduce repeat work

- Public pages use five-minute incremental static regeneration and bypass authentication middleware. Catalog data caches for 15 minutes; sanitized Instagram data for one hour. Studio mutations invalidate relevant caches.
- Account, checkout, and Studio remain dynamic and private.
- Storefront photos use their original files following the requested visual rollback. Build-generated WebP variants are no longer selected for delivery. Public page caching remains enabled; original files do not require request-time image transforms.
- Turnaround estimates cache for five minutes. Scheduling reads only needed fields and avoids recalculation for tracking changes. Checkout reads products in one query.

Reducing repeated server work helps active CPU usage, but does not guarantee a particular bill. Monitor function invocations, active CPU, memory duration, transfer, and cache behavior after deployment in the correct Playbook team. See [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute).

## Before production sign-off

1. Restore Supabase project `vouheqlstnftakhlpzmy`, apply pending migrations, and complete [AUDIT.md](AUDIT.md).
2. Compare usage against the previous deployment and configure available spend alerts/controls.
3. Deploy the new durable request limits, then verify provider quotas for address lookup and email. Origin checks and body limits do not stop scripted spam.
4. Verify current plan terms and backup requirements in provider dashboards; historical price and quota estimates have been removed.

Free Supabase projects can pause after inactivity. No synthetic keep-alive job was added. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Studio now renders lists in pages and batches database reads. It still loads the full order history for summaries; move those to server-side aggregation before substantial growth. Checkout now deduplicates retries transactionally. Public scheduling reads are paginated.

Product image transformations run only on admin uploads. Production serves these resized files directly from Supabase Storage with long cache lifetimes; monitor Storage transfer alongside Vercel usage.
