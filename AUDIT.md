# UI, security, and hosting audit

Reviewed September 6, 2026 using the frontend-design and web-design-guidelines skills.

## Status and scope

Repository changes are implemented and locally verified. **All four September 6 migrations are now applied to the live Love & Co. database. The website release was deployed successfully to Vercel.** The owner reports Supabase is healthy after restoring project `vouheqlstnftakhlpzmy` (loveandco, Playbook). Supabase access to Playbook is now authorized. Live database metadata, grants, RLS, migration history, Storage, and security advisors were checked after migration. Vercel production settings and end-to-end application behavior remain unverified.

Review covered storefront/Studio UI, authentication, API handlers, migrations and database access, checkout pricing, scheduling, caching, images, dependencies, and external integrations. Local PostgreSQL tests establish checked-in migration behavior, not the hosted project's current state.

## Security changes

| Severity before fix | Finding | Implemented protection |
| --- | --- | --- |
| Critical | The migration-defined public read policy on studio_settings also covered the later Instagram token column. Live exposure is unverified. | Remove public/customer settings access; select only scheduling fields. Rotate any token stored under the old policy. |
| High | Customer profile update permissions needed explicit sensitive-column protection. | Column grants allow only contact/address edits, protecting role and email; own-profile RLS enforced. |
| High | Order reads included email ownership; claiming used wildcard matching. | Reads require authenticated user ID; claiming requires verified auth email and exact normalized equality. |
| High | Client product identity/pricing and separate order/item inserts weakened checkout integrity. | Server resolves canonical products/pricing; service-only transactional RPC saves orders and items atomically. |
| High | Production Studio could fall back to preview without configuration. | Production fails closed; admin email allowlists require verified email. Notification recipients do not grant admin access. |
| Medium | Mutation inputs and redirects lacked consistent bounds. | Streamed body limits, type/quantity/date checks, safe redirects, same-origin checks, generic server errors. |
| Medium | Broad reads/caching could include unnecessary sensitive fields. | Server-only modules, no-store privileged requests, narrow settings/scheduling reads, sanitized public caches. |

Also added order-scoped item updates, write allowlists, provider timeouts, database constraints/indexes, hardened trigger search path, private mutation responses, and browser security headers. Changes are in the two September 6 migrations; `supabase/audit.sql` provides read-only live verification queries.

## UI findings addressed

- `components/Home.js:1` — product-led hero, clear shopping/custom-order actions, cohesive porcelain/blue styling.
- `components/Header.js:48` — mobile navigation expanded state and Escape support.
- `components/FancySelect.js:8` — native select restores keyboard support and required validation.
- `lib/use-modal-focus.js:5` — dialog focus trapping/restoration, Escape, and inert background.
- `app/layout.js:30` — skip link to page content.
- `app/globals.css:1334` — visible focus, contrast, responsive controls, and reduced-motion rules.

Improved address autocomplete semantics, form labels, loading feedback, galleries, cart synchronization, and configuration states. Removed carousel autoplay and public build metadata.

## CPU and transfer

Public pages prerender with five-minute ISR and bypass auth middleware. Catalog caches for 15 minutes, turnaround for five minutes, sanitized Instagram for one hour; mutations invalidate relevant caches. Private routes remain dynamic. Checkout batches product reads; scheduling narrows/paginates reads and avoids unnecessary recalculation.

Storefront image delivery was reverted to original photo files at the owner’s request. The earlier 93% reduction measured generated variants that are no longer selected for delivery. Public page/data caching and upload-time image optimization remain enabled. See [CAPACITY.md](CAPACITY.md).

## Validation

- Lint and production build passed.
- **62 tests passed**, including actual PostgreSQL execution via PGlite of all migrations, anonymous access denial, profile column permissions, order ownership, and atomic rollback.
- Dependency audit reported zero vulnerabilities at review time.
- Chromium/axe scans of eight public routes and populated product, checkout, and Studio states detected zero WCAG A/AA violations in the tested states. Mobile homepage had no horizontal overflow.
- Interaction checks passed for mobile menu, Escape, required options, cart persistence, focus trap/restoration, and bag URL state. Cross-origin mutations returned 403; invalid quantities 400; unauthenticated production admin writes 401.
- Local production checks verify public cache responses without session cookies and private routes without shared cache hits. Expired ISR entries can return STALE during background regeneration.

Automated checks do not establish complete accessibility compliance. Live Auth, provider delivery, payments, hosted policies, and billing remain unverified.

## Remaining findings

| Priority | Outstanding work |
| --- | --- |
| High | Apply all pending September 6 migrations before app deployment; checkout depends on the new RPC. |
| High | Deploy the new durable per-client/global limits, then verify provider quotas and edge abuse controls. |
| High if token stored | Rotate any Instagram token stored under the old public settings policy. Code cannot invalidate an exposed token. |
| Medium | Checkout idempotency is now implemented and tested locally; apply migration 4 to enable it live. |
| Medium | Studio now renders paginated lists and batches database reads. It still loads full order history for summaries; move to server aggregates at scale. Schedule recalculation remains separate from atomic order edits. |
| Medium | Verify live RLS/grants, functions, Auth confirmation/redirect allowlists, admin MFA/password settings, secrets, and backups. Audit any Storage buckets; none are defined in this repository, which serves static photos. |
| Medium | Verify Google key restrictions/quotas and email sender/delivery configuration. CSP protects framing/base/object usage; strict script policy remains additional hardening. |
| Low | Studio tabs, filters, and selected orders now persist in the URL, and order edits warn before tab changes or page unload. Other forms still need unsaved-navigation protection. Continue manual screen-reader/keyboard review. |
| Low | Unused public/images/Baby_5.png contains HEIC data that the decoder cannot process. It is skipped; replace before use. |

## Live deployment sequence

1. Finish restoring loveandco `vouheqlstnftakhlpzmy` through Playbook's Vercel Storage integration or Supabase dashboard. Do not use PlanWell's database.
2. Use an authorized Playbook account and verify environment variables in provider dashboards. Do not paste secrets into chat.
3. Apply only pending migrations in timestamp order, including all four September 6 migrations. Do not rerun already-applied create-table migrations.
4. Run `supabase/audit.sql`. Anonymous/customer token reads, role/email updates, direct order inserts, contact reads, and checkout RPC execution should be denied.
5. Rotate affected tokens and complete provider abuse/security controls.
6. Deploy, verify real sign-in, customer isolation, checkout, Studio operations, and caching. Compare usage afterward.

No upgrade, keep-alive cron, or infrastructure spending change was made.

## Studio expansion follow-up

See [STUDIO.md](STUDIO.md). Added atomic administrative order/item/note edits, a restricted notes table, an inquiry inbox, customer history, CSV exports with formula protection, print privacy, product editing, and checkout pause/announcements. Browser saves exposed an internal-host mismatch in the origin guard; it now compares the browser-visible Host with the Origin and retains protocol and cross-site checks. New PostgreSQL tests verify that customer and anonymous roles cannot access staff notes or execute Studio updates.

## Full operations follow-up

Migration 4 adds request budgets, transactional checkout deduplication, versioned proofs, private activity/inventory, shipping/pickup, galleries, and editable public information. New tables/RPCs deny anonymous/customer access. Uploads are admin-only decoded/re-encoded WebP with size/pixel limits. See [STUDIO.md](STUDIO.md) for rate ceilings, tests, and live Storage checks.

## Live database verification — September 6, 2026

Authenticated to Playbook and linked this checkout to `vouheqlstnftakhlpzmy` (loveandco), confirmed ACTIVE_HEALTHY. The existing wedding-category constraint matched migration `20260815000006`; its missing history entry was repaired without changing the constraint. A dry run then showed exactly the four September 6 migrations, which were applied successfully with the CLI.

Post-migration checks:

- All eleven repository migration versions are recorded as applied.
- Original row counts remain 3 orders, 24 products, and 2 profiles.
- Every public-schema table has RLS enabled.
- Anonymous and authenticated roles cannot read the Instagram token, private notes, contact messages, operational tables, or insert orders directly; profile role/email updates are denied.
- No public-schema function is executable by anonymous or authenticated roles.
- Order read policies use authenticated user ID ownership.
- No Storage buckets or Storage policies existed at verification time; the photo bucket will be created on first production upload.
- No Instagram token was stored in the previously public settings column at preflight.
- Supabase security advisor reports one warning: leaked-password protection is disabled. No other WARN/ERROR security findings were returned.

Website deployment succeeded; public routes and unauthenticated Studio/API guards passed live checks. Live account/checkout/photo workflows and Vercel settings remain unverified. Historical local-only findings above should be read in conjunction with this live verification.
