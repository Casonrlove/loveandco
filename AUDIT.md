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

## Follow-up audit — September 30, 2026

Seven read-only Codex CLI jobs (`gpt-6.1-sol`, medium reasoning) reviewed Studio APIs, checkout/orders, per-user resources and public proxies, database migrations, platform config, storefront UI, and Studio UI, prioritising changes since September 6. Each lead was checked against the code before any change. All verification was offline: hosted grants, Storage, Vercel settings, and live workflows remain unverified, as above.

### Fixed

| Severity | Finding | Change |
| --- | --- | --- |
| Medium | Public rate limiting spent the shared daily budget before the per-client budget, and contact and address checks ran it before basic validation. One IP could use up the 300/day contact budget with 300 quick requests and block the form for everyone for up to a day. | Per-client budget is checked first (`lib/operations-store.js`); contact validates and applies its spam trap, and address suggestions reject short queries, before the limiter runs. Applied with owner approval. One IP at 5 per 10 minutes can still reach the 300/day contact ceiling in about 10 hours; the global cap is a cost ceiling, not abuse protection. Not unit-tested: the module imports `server-only`. |
| Medium | `/api/turnaround` rescanned every active paid order on each storefront visit (Header and TurnaroundNote both call it) after its cache was removed on September 24. | Result cached for 60 seconds, keyed by shop date so the day-rollover fix still holds (`lib/schedule-service.js`). |
| Medium | Choosing local pickup with "Save this address" checked blanked the signed-in customer's saved address. | Checkbox only renders for shipping; server saves addresses only for shipping orders. |
| Medium | Checkout replay returned the order's current details, including later claims and Studio corrections, to anyone holding the original body and key. | Replays return only the order ID; the checkout client never read more. |
| Medium | Scheduler reported a finish date for orders that ran past its 180-session horizon, which was shown publicly and saved as `promised_on`. | `completionDate` is null while any work is unallocated; Studio shows "Beyond schedule". |
| Medium | Shop bag plus button allowed quantity 501, which the cart parser then silently dropped. | Plus disabled at 500, matching checkout and the custom bag. |
| Medium | Shop and custom bag minus buttons went below the 10-piece napkin minimum, which checkout then rejected. | Both drawers apply `NAPKIN_MIN_QTY` like checkout. |
| Medium | Custom-page bag subtotal omitted baby bundle add-ons and one-time design fees. | Uses shared `cartTotal`. |
| Medium | Design details left in a cart after unchecking the paid design option were saved without the design fee. | Personalization is saved only when the design option is charged. |
| Medium | Studio "Save Instagram token" left all busy-gated Studio controls disabled after a network failure. | `try/catch/finally` with an error message. |
| Medium | Order editor fields stayed editable during save; edits made mid-save were silently replaced by the response. | Editor fields are disabled while saving. |
| Medium | Overlapping calendar availability saves could land out of order and drop a day off. | One settings save at a time; extra clicks show "Still saving". |
| Low | Studio order PATCH accepted a standalone `subtotal` that disagreed with line items. | Rejected unless line items are sent; total is always derived. |
| Low | Product photos blocked vertical page scrolling when a swipe started on the photo. | `touch-action: pan-x pan-y pinch-zoom`. |
| — | `tests/catalog-pricing.test.mjs` still expected the $14 paci clip price. | Updated to $6. Regression tests added for the scheduler, subtotal, and personalization changes. |

### Needs owner decision

- **Payment before production.** Studio can set an unpaid order to started/complete; SQL checks proof approval but not payment. "Mark finished … and paid" and manual status edits rely on this, so it is policy, not a defect.
- **Bundle add-on production time.** Extra outfits, bibs, burp cloths, and paci clips are saved with 0 design/stitch minutes, so they add no scheduled workload. The shop needs per-add-on minutes to fix this.

### Deferred

- Stale "Mark finished" after a cancellation or refund in another tab, and settings saves in general, need an order/settings revision column checked inside `studio_edit_order`: a live migration plus RPC change.
- Calendar save errors are announced outside the dialog (inert while open); day buttons lack full-date labels and `aria-pressed`.
- Website tab edits are lost on tab switch without an unsaved-changes warning.

### Not reproduced / clean

Database RLS, grants, RPC execution, and the September 26 default-privilege migration; Studio admin gating, allowlists, and photo upload handling; proof token checks and photo path handling; auth redirects; headers, `server-only` boundaries, and public caches were all reported clean and are consistent with the code reviewed.

## Site-wide audit — October 14, 2026

Eight read-only review agents covered storefront browse, buy flow, account/auth/proofs, Studio, the CSS design system, application security, database security, and performance/platform. Every line number was verified against the file. No code was changed. Lint is clean and 66/66 tests pass. The "impeccable" design skill was requested but is not installed in this environment; the review used an equivalent UX rubric (hierarchy, spacing, affordance, states, 375px mobile, copy, focus/contrast). Top findings were spot-checked by the coordinating session.

### Do first (highest impact, smallest diff)

| Area | Finding | Fix |
| --- | --- | --- |
| Storefront | `app/globals.css:1477-1479` `.home-page` override re-scopes `--blue-mid` and `--muted`, so the homepage CTA is white on `#9fc4e6` (1.8:1) and prices/eyebrows are 3.4:1. Regression of the Sept 6 contrast fix. | Delete the `--blue-mid`, `--blue-ink`, `--muted` lines (or the whole block, which also removes the header/footer colour seam). |
| Storefront | `app/globals.css:226`, `:301`, `:348` `.favorites-track`, `.bundle-grid`, `.split-story` have no mobile rule; at 375px they render three ~105px columns and a two-column About page. | Default to `1fr`, move the multi-column value into the existing `@media (min-width: 640px)` block. |
| Buy flow | `components/Checkout.js:75-80` discards `result.order.id`; confirmation shows no order number or total, and no customer email is sent. A reload shows "Your bag is empty". | Keep `{ id, total }` in state and print it; persist `isSubmitted` in `sessionStorage`. |
| Buy flow | `components/Checkout.js:155`, `Shop.js:440`, `CustomPage.js:120` the "Remove one" minus button deletes the whole line at the minimum, so one tap drops 10 personalized napkins. | `disabled={item.quantity <= min}`; the Remove link already exists. |
| Studio | `components/Studio.js:291` every message, including "Availability saved.", renders in red `.form-error` with `role="alert"`. | Drop `form-error`, use `role="status"`, reserve red for catch branches. |
| Studio | `components/Studio.js:326-328` "Paid", "Venmo sent", "Start" quick-taps fire immediately and email the customer. | `window.confirm` on Paid and Venmo sent. |
| Security | `app/api/orders/route.js:15` `protectPublicRequest` runs before key, pause, and validation checks, so junk POSTs burn the shared 500/day checkout budget (the Sept 30 contact fix was not applied here). | Move the limiter after input validation, before product lookup. |
| Security | `supabase/migrations/20260926000001_explicit_data_api_grants.sql:4-7` default-privilege revoke covers tables and sequences only; any new `create function` is anon-callable by Postgres default (verified in PGlite). | Migration: `alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;` and add the `defaclobjtype = 'f'` check to `supabase/audit.sql`. |
| Auth | `app/auth/callback/route.js:27` + `app/login/page.js:19` every failed code exchange (expired reset link, sign-up link, link opened on another device) says "That Google sign-in expired". | Branch on `next === '/update-password'` to `/forgot-password?error=expired`; make the generic copy provider-neutral. |
| Auth | `components/AuthForm.js:77` raw Supabase errors shown; "Email not confirmed" is a dead end because nothing resends confirmation. | Map the message and add `supabase.auth.resend({ type: 'signup', email })`. |

### Storefront browse

- [Med] `components/Shop.js:385`, `Home.js:16` napkin cards say "From $8.00 each" but the first visible total is 10×$12 + $30. Label "$8–$12 each · 10 minimum".
- [Med] `components/Shop.js:385` per-person package card uses `item_price || price` (reverse of `basePrice`) and omits the $20 design fee the picker includes. Use `basePrice(product)`.
- [Med] `components/Home.js:41` hero lost the custom-order action listed as fixed on Sept 6; `.home-custom-link` at `globals.css:1363` is orphaned. Re-add the link.
- [Med] `components/Home.js:38` ~75 words of hero copy before the CTA; "shoot me a message" has no link. Cut to two sentences, link to /contact.
- [Med] `components/InstagramReel.js:32` + `lib/instagram.js:34` video posts render as blank boxes because `thumbnail_url` is discarded. Keep it and pass as `poster`.
- [Med] `app/globals.css:654` catalog "Add to bag" is borderless text with a "+" and does not read as a button. Add an inset border or `var(--blue)` fill.
- [Med] `components/Footer.js:12` /shop-info (FAQ, care, pickup, turnaround policy) is reachable only from the footer; link it from `TurnaroundNote.js:20`.
- [Med] `components/Shop.js:295` design validation error renders above the turnaround note, not next to the button that triggered it. Swap lines 295 and 296.
- [Low] `Shop.js:264` price filter buckets napkins at $12 so they show under "Under $30". `Shop.js:379` every card says "CUSTOM EMBROIDERY" including preorder. `Shop.js:391` empty-collection copy has no link to /custom. `About.js:13` no CTA at the end. `Header.js:71` Bag link always goes to /shop hub, stranding product-page shoppers.
- [Low] `app/shop/[category]/[product]/page.js` no `generateMetadata`; every product tab is titled "Love & Co. Embroidery". `ProductGallery.js:84` first image is lazy. `FavoritesCarousel.js:27` no `sizes`. `globals.css:1388` mobile announce bar is 11px. `globals.css:1351` scroll padding is desktop-only so /shop-info anchors land 100px low. `globals.css:258`, `:1387` sub-44px touch targets. Redirect routes use `redirect()` (307) not `permanentRedirect()`.

### Buy flow

- [Med] `components/Checkout.js:24-25` `website.ordersOpen` is passed but never read; a paused shop is discovered as a 409 after the whole form is filled. Show `pausedMessage` and disable submit.
- [Med] `components/Checkout.js:44-48` design-validation failure does not name the item and the only remedy is remove and re-add. Prefix with `item.name`.
- [Med] `components/Checkout.js:219` toggling pickup and back unmounts `AddressFields` and wipes the address. Keep mounted with `hidden`.
- [Med] `components/Checkout.js:175` "Estimated total" never says what is estimated; shipping is mentioned nowhere. One helper line.
- [Med] `app/globals.css:822-823` quantity buttons are ~27px; `:1004-1005` each checkout line opens with a full-width square image below 860px (~1,000px of photos for three items). Use a `5rem 1fr` grid by default.
- [Med] `components/AddressFields.js:145-153` street input has `autoComplete="off"` so native address autofill never triggers. `:205-214` State is free text with a datalist so "Tex" passes `required`. Use `autoComplete="shipping address-line1"` and a native `<select>`.
- [Med] `components/CustomPage.js:129-133` drawer total includes the design fee via `cartTotal` but shows no fee row. Copy the Shop drawer rows.
- [Low] `Checkout.js:197-206` Venmo checkbox not `required`. `Checkout.js:218` single-option delivery select renders unstyled. `Checkout.js:139` "Item $X each" vs "$X each". `DesignFields.js:171-178` optional selects show "Choose…" instead of "None". `Shop.js:175,202,224` prices hardcoded in helper sentences. `CustomPage.js:96` "Needed by" accepts past dates. `globals.css:805` drawer close is an unsized 16px icon. `Checkout.js:27` unused `itemCount`.

### Account, auth, contact, proofs

- [Med] `components/AuthForm.js:71-74` signing up with an existing email shows "Check your email" and nothing arrives. Check `data.user?.identities?.length === 0`.
- [Med] `components/Contact.js:23,26` discards the server's 400/429 text so every failure reads "could not be sent". Read `result.error`.
- [Med] `components/CustomerProof.js:14-15` on 409 the pending form stays mounted and retries forever; `:19` the loading state reads as "your link is broken". Re-fetch on 409; add a loading state.
- [Med] `components/AccountClient.js:120-131` orders list has no date or order number; `:88-91` no change-password link while signed in. Both fields are already in the payload.
- [Med] `app/account/page.js:13-14` no `app/error.js` anywhere, so a DB hiccup gives a raw 500. Add a 10-line error boundary.
- [Med] `components/Checkout.js:229` "Create an account" lands on the Sign in tab. Support `?mode=signup`.
- [Low] `AuthForm.js:92-93` stale error survives tab switch, tabs lack `aria-pressed`, `className="studio-tabs compact"` has no `.compact` rule. `AuthForm.js:74` form stays enabled after "Check your email". `ForgotPasswordForm.js:15` message not cleared on resubmit. `UpdatePasswordForm.js:25` no success confirmation. `Contact.js:40-44` success card has no next step. `CustomerProof.js:20` Approve and Request changes look identical and disabled states have no explanation. `role="status"` nodes mounted only when non-empty in five components.

### Studio

- [High] `components/Studio.js:246-290` on a phone, 8 tiles plus up to 12 night cards sit above the tab bar, so the queue is 2–3 screens down. Render the board under the tabs and slice upcoming to 4.
- [High] `components/Studio.js:367,376` below 900px the order index stacks above the editor, so tapping an order visibly does nothing. `scrollIntoView` on mount in `StudioOrderEditor`.
- [Med] `components/StudioProofs.js:4` proof text pre-filled with the placeholder sentence, so one tap sends it to the customer. Leave blank. `:9` "Copy this link now" with no Copy button.
- [Med] `components/StudioCalendar.js:144` `onDoubleClick` fires on top of two clicks, three saves per double-tap. Delete it. `:184` "Clear future offs" has no confirm.
- [Med] `components/StudioInventory.js:8` adjust form never resets, second tap double-applies the restock.
- [Med] `components/Studio.js:249` vs `lib/studio-insights.js:17` "In production" counts queued+started but filters to queued. `Studio.js:295` board select and Orders tab select use different option sets.
- [Med] `lib/studio-insights.js:13-54` `promised_on` is never read in any Studio component, so late orders are invisible. `StudioOperations.js:39-46` open inquiries are not on the morning board.
- [Med] `components/Studio.js:197-219` Hide/Show and Remove product have no try/catch or busy gating. `:105,136,159,182,203` `response.json()` on an HTML error page shows "Unexpected token <" raw. `:127-147` `patchOrder` sets no success message and errors render off-screen above the panel.
- [Med] `components/Studio.js:514-515` Edit and Duplicate overwrite an in-progress product form without warning. `:491-499` static Photo select and uploaded photos both write `image_path`. `:286` nine tabs plus a Calendar pseudo-tab make five rows of pills at 375px.
- [Low] `globals.css:908-914, 1219` ~35px action buttons. `Studio.js:385` server-rejected minutes keep the invalid value. `StudioOperations.js:17` customer history shows ID hashes. `Studio.js:314,369` lowercase payment chips. `Studio.js:29` day pills out of order. `StudioOrderEditor.js:20` + `StudioProofs.js:5` the same order is fetched twice on open. Duplicate turnaround line, duplicate "Shipping details" button, carrier fields shown for pickup, stock log without timestamps.

### Design system (app/globals.css)

- [Med] `:1340-1399` the Sept 6 redesign layer silently overrides earlier rules (`.form-error` 839 vs 1381, `.soft-button:hover` 73 vs 1362, `.brand img` three times, mobile `.site-bar`, `:root` twice); roughly 60 dead declarations. Fold each late rule into its original block.
- [Med] `:1` Google Fonts via CSS `@import` is a render-blocking three-hop chain. Use `next/font/google` in `app/layout.js` and drop the preconnects and the font entries in the CSP.
- [Med] `package.json:18,21` `bootstrap` and `react-bootstrap` are installed but never imported. Uninstall both; keep `react-bootstrap-icons`.
- [Med] `:1040-1043` `.name-field-input:focus { outline: none }` beats the global focus ring. Delete `outline: none`.
- [Med] `:1403-1469` Studio uses a second visual language (bordered boxes, 0.5rem radii, hard-coded hexes) next to the storefront's pills. Reuse `.cal-nav button` and `.order-form input` declarations; replace ~20 hexes with the existing tokens.
- [Low] 26 unused class selectors (~140 lines): `.build-footer` 974–993, `.split-box*` 1110–1140, `.fancy-select-menu` 478–502, `.instagram-grid`/`.instagram-card` 365–387, `.preorder-band`/`-copy`/`-preview` 607–622, 673, 677, `.lookbook-grid` 355–363, 414, `.session-grid` 923–925, 942, `.hero` 161–162, `.fancy-select-required` 531, `.is-empty` 477, `.days-off` 887–888, `.item-editor` 919, `.featured-page` 364, `.footer-mark` 970, `.checkout-summary` 837, `.instagram-empty` 388, `.payment-requested` 1193, `.home-custom-link` 1363, `.btn-contact-submit` 62, 73, 1362, `.queue-row`/`.order-row`/`.studio-stat` 1379–1380. Duplicated custom checkbox (1082 vs 1154). Four scrim colours. Eleven breakpoints; header flips at 899 while grids flip at 760/800/860. Five `!important` chains. Calendar chips at 9.9px. `.cal-day.is-out` opacity puts day numbers near 2.2:1. 14 redundant `box-sizing` lines. `overflow-y: scroll` duplicates `scrollbar-gutter`. No spacing or type scale (40 font sizes).

### Application security

- [High] `npm audit --omit=dev` on October 14 reports three vulnerabilities, all with a fix available: `next` 16.0.0–16.3.7 (critical), `sharp` below 0.35.5 (high, librsvg CVE-2026-96889), and `source-map-js` 1.0.0–1.2.1 (high, event-loop denial of service). Run `npm audit fix`, then lint, test, and build.

Route matrix: every mutation route has an origin check and validated body; public POSTs are rate-limited; admin routes are gated by `requireAdmin`/`requireStudio`; photos route regex blocks traversal; `safeNextPath` blocks open redirects; no SSRF (fixed hosts only); no private data in shared caches. No Sept 6 or Sept 30 fix was found regressed.

- [Low] `app/api/account/route.js:19-21` `full_name`, `phone`, `venmo_username` have no length limits (up to 128 KB) and render in Studio and emails. Reuse the `validateSubmission` limits.
- [Low] `app/api/address/suggest/route.js:8-9`, `details/route.js:9-10` `q`, `session`, `id` forwarded to Google at any length. Cap at 200/100/300.
- [Low] `lib/require-admin.js:16` + `app/api/studio/photos/route.js:25-31` Supabase Storage error messages reach the Studio client. Rethrow generic.
- [Low] `proxy.js:17` same-origin check covers only the five listed API prefixes; widen to `/api/:path*` so a future route cannot skip it.
- [Low] Four Studio routes re-implement the guard inline instead of `requireStudio()`.
- [Low] `app/auth/callback/route.js:8,25` redirect origin comes from the Host header; fine on Vercel, pin via env if ever self-hosted.

### Database

RLS on all 12 tables with explicit service-role grants, `(select auth.uid())` policies, `search_path = ''` on every function, EXECUTE revoked on all existing RPCs, row locks and advisory locks on proof/checkout races, indexes on every filtered path.

- [Med] `app/account/page.js:14` → `lib/store.js:235-247` customer order history is read with the service-role client, bypassing the `orders_select_own` policy that exists for this read. Use the session client so RLS is a second check.
- [Low] `lib/store.js:332-355` `updateOrder` is dead in database mode and is the only write outside the atomic RPC. Delete it.
- [Low] `20260906000002_atomic_checkout.sql:27-35` four `NOT VALID` constraints were never validated. One migration.
- [Low] `app/api/orders/route.js:66-70` profile address save discards `error` after the order commits. Return a warning.
- [Low] `20260814000001_core_store.sql:97,103-105` `handle_new_user` never syncs an auth email change and overwrites a customer-edited `full_name`.
- [Low] `orders.email` has no DB-level lowercase constraint; claiming depends on every writer normalizing.
- [Low] No PII retention path for `contact_messages`, `checkout_requests`, `order_proofs.proof_text`, or orders after account deletion.
- [Low] `tests/supabase-security.test.mjs:20-25` never creates a table or function after the default-privilege migration, so that migration is untested. Add a probe table and function.
- [Low] `lib/operations-store.js:32-39` `checkoutReplay` duplicates what `create_checkout_once` already does and fetches the full order to return only `id`.

### Performance and platform

- [Med] `app/layout.js:8` no `metadataBase`, OG image, title template, or canonical, so links shared from Instagram or texts render no preview card. ~20 lines, plus `generateMetadata` on product pages and `robots: { index: false }` on account, checkout, login, and studio.
- [Med] `components/StoreImage.js:7` 35 of 56 photos under 512 KB are served raw at 1125–2400px into 170–600px slots (9.2 MB total; the 480w WebPs for the same files total 1.7 MB). Each catalog page view costs roughly 5–7 MB. This is the owner's quality decision; changing `512 * 1024` to `0` recovers over 80%.
- [Med] `scripts/build-images.mjs:7` 21 originals over 512 KB (~125 MB, ten at 4284×5712) are never rendered but are committed, deployed, and publicly fetchable at `/images/IMG_3415.png` (27 MB). Move originals out of `public/`.
- [Med] `CAPACITY.md:9` and the "CPU and transfer" section above say variants are no longer delivered, but commit 9ae1889 reintroduced variant delivery for files over 512 KB. Update the sentence.
- [Med] `lib/scheduler.js:37`, `lib/schedule-service.js:34` sessions and the turnaround cache key use server-local time with no `TZ` pinned; Vercel defaults to UTC, so from about 7 pm Central the shop date is already tomorrow. Confirm `TZ=America/Chicago` in the Vercel project env.
- [Low] No sitemap. Six redirect-only route files instead of a `redirects()` block. `Logo.png` and `logo-crest.png` are byte-identical. `public/manifest.json` is unlinked and its theme colour disagrees with the layout. `Header.js:34` and `TurnaroundNote.js:11` both fetch `/api/turnaround` on every page, two invocations for one cached value. `instagram/route.js:16` uses stale-while-revalidate so a fixed token still shows the stale feed. `next build --webpack` opts out of Turbopack with no recorded reason. No `"type": "module"` so tests warn on every import. Hard-coded ngrok host in `allowedDevOrigins`. `cartTotal` with `wantsDesign` has no direct test. `Shop.js` is one 468-line client tree.

### Not verified

No `.env.local` exists, so nothing was rendered or screenshotted; all findings are from reading code. Hosted Vercel settings, live Auth email templates, the cross-device PKCE behaviour, and the Supabase sign-up duplicate-email response should be confirmed live before the related fixes land.

### Fixed — October 14, 2026

Applied in three waves after the audit above: the "Do first" table inline, then five parallel agents with disjoint file ownership (Studio, storefront and buy flow, account and auth, application security, database), then one agent for the shared files (`globals.css`, layout, config, package). Lint clean, 70 tests pass (up from 66), `npm audit --omit=dev` reports zero vulnerabilities, and `npm run build` passes on Turbopack with `--webpack` removed.

| Area | What changed |
| --- | --- |
| Storefront | Homepage palette override keeps its tan and surface values but no longer lowers CTA and muted-text contrast. Favorites, bundles, and the About split stack to one column below 640/800px. Napkin cards say "$8–$12 each · 10 minimum"; package cards use `basePrice` plus the design fee; helper sentences read prices from constants. Hero cut to two sentences with contact and custom-order links. Instagram videos get a poster. Catalog "Add to bag" has a border. Turnaround note links to shop info; empty collection and About link onward; Bag link keeps the shopper on the current shop page. Preorder eyebrow on cards. Product and category pages export `generateMetadata`; first gallery image is eager; favorites have `sizes`; redirect-only routes use `permanentRedirect`. |
| Buy flow | Confirmation shows order number and total and survives reload via `sessionStorage`, cleared on "Continue shopping". Minus button is disabled at the minimum in all three drawers. Paused shop shows the message and disables submit. Design errors name the item. Address stays mounted when switching to pickup. "Estimated before shipping" helper. Venmo checkbox is required. Street input allows native autofill; State is a native select. Custom drawer shows the design-fee row; "Needed by" has a minimum of today. `cartTotal` with and without `wantsDesign` is tested. |
| Account and auth | Expired or cross-device email links route to forgot-password with an honest message; login copy is provider-neutral. Friendly sign-in errors with a resend-confirmation button; duplicate sign-up detected. `?mode=signup` opens the Create account tab; checkout links to it. Tab switch clears stale messages; tabs have `aria-pressed`. Order list shows number and date; change-password link; password update confirms. Contact shows server validation and rate-limit text and a next step. Proof page has a loading state, re-fetches on 409, and distinguishes Approve from Request changes. New `app/error.js`. Account orders are read through the session client so RLS backs the filter. |
| Studio | Success messages render as status, errors as alerts, sticky at the top. Paid and Venmo sent confirm before emailing. Board sits below the tabs with four night cards; order editor scrolls into view on phones. Overdue and Open inquiries tiles; "In production" filter matches its count; one shared filter list. Proof text no longer pre-fills the placeholder; Copy link button. Calendar double-click removed; Clear future offs confirms. Inventory form resets after save. Hide/Show/Delete have error handling and busy gating; Edit/Duplicate confirm before overwriting a draft; HTML error pages read as "Server error". Minutes input resets on rejection. Static photo select hidden once photos exist. Carrier fields hidden for pickup; customer history shows dates; stock log shows dates; day pills in order; duplicate turnaround line and Shipping details button removed. |
| Design system | 25 unused selectors, 13 redundant `box-sizing` lines, duplicate `:root`, duplicate checkbox, six non-motion `!important` chains, `overflow-y: scroll`, and the name-field `outline: none` removed. `--scrim` and `--line-strong` tokens; Studio hexes tokenised. Calendar chips at 0.72rem; out-of-month days use colour not opacity. 44px targets on bag, drawer close, order actions, favorites nav, and text actions. Checkout lines use a thumbnail column on mobile. Fonts via `next/font/google`, self-hosted; Google Fonts removed from CSP. `globals.css` went from 1,482 to about 1,300 lines. |
| Security | Checkout limiter runs after in-memory validation and before any database read. Account profile fields share the checkout length limits (tested). Address lookup query, session, and place ID are bounded before the limiter. Storage error messages no longer reach the Studio client. Same-origin check covers every `/api` route. Four Studio routes use `requireStudio()`. Instagram revalidation uses `{ expire: 0 }`. Profile-save failure after checkout returns a warning. `next`, `sharp`, `source-map-js` updated. |
| Database | Migration `20261014000001` revokes default EXECUTE on new functions globally (a schema-scoped revoke is a no-op for the built-in PUBLIC grant), tested with a probe table and function. Migration `20261014000002` validates the four `NOT VALID` constraints, adds `orders_email_normalized`, and fixes `handle_new_user` to sync email changes and keep a customer-edited name (tested). Dead `updateOrder` deleted; `checkoutReplay` returns only the ID. `audit.sql` gained function-default, constraint-validation, and trigger checks. |
| Platform | `metadataBase`, title template, Open Graph image, `NEXT_PUBLIC_SITE_URL` (added to `.env.example`). `noindex` on account, checkout, login, studio, and password pages. `app/sitemap.js` and a `Sitemap:` line in robots. Shared in-flight turnaround fetch. `Logo.png` and `manifest.json` deleted with a permanent redirect for stored image paths. `"type": "module"`; `bootstrap` and `react-bootstrap` uninstalled. CAPACITY.md describes the shipped image behaviour. |

### Skipped — October 14, 2026

- Owner decisions, unchanged: the 512 KB raw-image threshold and the 125 MB of originals in `public/`; PII retention; payment-before-production; the `.home-page` palette block beyond the three contrast lines.
- Needs the hosted environment: `TZ=America/Chicago` on Vercel; Supabase email templates; live confirmation of the cross-device link failure and the duplicate-email sign-up response. The two new migrations are tested under PGlite but not applied; `VALIDATE CONSTRAINT` aborts if any live row violates, so check first.
- Too large for this pass: folding the remaining Sept 6 CSS override layer, consolidating eleven breakpoints into three, a spacing and type scale, splitting `Shop.js` into server and client parts, a customer confirmation email, full `token_hash` handling for cross-device auth links, the nine-tab Studio restructure, the duplicate order fetch on open, and always-mounted live regions.
