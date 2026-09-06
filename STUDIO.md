# Studio operations

Studio is available at `/studio` to verified administrators. Production access fails closed without configuration. Local development can use the preview file store.

## Daily workflow

- **Work queue:** review orders, record payment requests/payments, start production, open shipping details, filter work, and export the selected view as CSV.
- **Orders:** edit customer name, phone, Venmo and shipping address; adjust item quantities, prices, and production minutes; save a recalculated quote; manage payment, fulfillment, priority, and tracking. Record cancellations and refunds with confirmation. Refunds must be performed separately in Venmo.
- **Private notes:** record production instructions that customers cannot read. Notes are stored in a separate restricted table and excluded from customer responses, CSV exports, and printed order sheets.
- **Customer communication:** open a customer email or a quote draft in your email application. Quote drafts use the last saved order. These links do not send automatically. Existing status notifications report delivery failure or unavailable email configuration.
- **Printing:** open an order and choose Print order sheet. The sheet includes customer details, the design proof, prices, and fulfillment information.
- **Customers:** search the customer book and open past orders. This is order history grouped by email, not a tool for changing account identities or administrator roles.
- **Inquiries:** review contact-form messages, draft replies, mark in progress/resolved, reopen, or prefill an unpaid order draft. Review and submit the draft to create an order; this does not automatically resolve the inquiry.
- **Products:** add, edit, duplicate as a hidden draft, show/hide, delete with confirmation, choose a photo from the existing library, and set display order. Editing preserves the product URL.
- **Website:** publish an announcement, pause new checkout submissions, and set a pause message. Existing orders and inquiries remain available. The server checks the pause setting for each checkout submission.
- **Availability & Instagram:** set weekly work days, minutes per night, days off, and the Instagram connection. Minutes save when leaving the field, rather than on every keystroke.

## Persistence and access

Apply pending migrations in order, including **`20260906000004_complete_operations.sql`**, before deploying this version. It adds restricted staff notes, inquiry statuses, shop controls, and atomic Studio order editing. All earlier pending migrations remain required.

Admin-only endpoints check authorization on every request. Staff notes and the update RPC are unavailable to anonymous and customer roles. Public website output contains only the announcement and order availability, not credentials or private settings. Changing an order's email/account ownership is intentionally excluded from the editor.

The order, item, and private-note edit is transactional. Schedule recalculation and email delivery happen afterward and remain separate operations. Concurrent edits do not yet have version conflict detection; avoid editing the same order in multiple tabs.

## Performance

Queue/order lists render 25 rows per page and customers 25 per page. Database order reads use batches to avoid silent row truncation, but Studio still loads all orders for its schedule and customer summaries; very large stores should move these summaries to server-side aggregation. Inbox and website settings load only when their panels open. Public announcements use the existing five-minute cache, invalidated when saved. Checkout availability is read directly, so a stale banner cannot bypass a pause.

## Validation and limits

62 automated tests pass, including quote calculation, validation, CSV formula protection, private-note permissions, transactional rollback, and origin checks. Chromium workflow checks cover saves, customer history, inquiry status, product editing, checkout pause, print privacy, and mobile layout. The tested panels have no detected axe WCAG A/AA violations.

Payments/refunds, postage purchases, account administration, hosting configuration, and arbitrary page layout editing remain outside Studio. Live provider settings and production behavior still need verification after migration/deployment.

Production-build checks also confirmed HTTP 401 for all new unauthenticated Studio endpoints, private no-store response headers, HTTP 403 for cross-origin mutations, and a cached public homepage without session cookies. No live migration or deployment was performed.

## Full operations upgrade

Apply pending migration `20260906000004_complete_operations.sql` before deployment.

- **Photos:** Products now supports upload, crop shape/zoom/position, reorder, and removal from the gallery. The first photo is the cover; save the product to publish changes. Up to 10 images are supported. The browser accepts JPEG/PNG/WebP under 10 MB. The server accepts processed uploads under 4 MB, checks a 20-megapixel decode limit, strips metadata, and resizes to at most 1440 pixels. Production uses the public Supabase `product-photos` bucket, created by the service-role client on first upload if absent. No client write policy is added; verify existing live Storage policies. Do not upload private documents. Removing a gallery entry does not delete the shared storage object. Local photos live in `.data/uploads`.
- **Checkout retries:** An unchanged checkout retains a random request key across retries/reloads in the same browser tab. The server binds it to a canonical payload/account fingerprint. A PostgreSQL transaction and advisory lock ensure concurrent requests create one order; changed content with the same key is rejected. Replays skip the new-order email. An intentional new submission after success gets a new key.
- **Spam controls:** Persistent database counters enforce per-client and global ceilings below. Expired counters are cleaned up during later requests. Checks fail closed if unavailable. Rejection returns 429 and Retry-After. The contact form also has a honeypot. Identity uses an HMAC of the Vercel-supplied client address, not stored raw IPs. Outside Vercel, all requests share a bucket rather than trusting caller-supplied forwarding headers. Verify client grouping if another proxy fronts Vercel. See [Vercel request headers](https://vercel.com/docs/headers/request-headers). These controls do not replace provider quotas or edge DDoS protection; rejected traffic still reaches the app.
- **Activity:** Order edits record the staff actor, timestamp, changed fields, and payment/status/total transitions. Proof creation/responses appear in the same history. History begins with this upgrade; previous actions are not reconstructed.
- **Proof approval:** Save order edits, write the exact personalization proof, then create and copy its approval link or open the email draft. Link creation does not send email. Only the token hash is stored; the raw secret is shown once and travels in the URL fragment/authorization header rather than a query string. Customers approve that specific version or request changes. New links supersede earlier versions. Issued proofs must be approved before started/shipped/complete; changing quantities supersedes approval. The response proves possession of the link, not separately authenticated identity. Never put private staff notes into proof text.
- **Inventory:** Track blanks/materials by name, size, color, and low-stock threshold. Add positive restocks or negative usage with a reason. Movements record the actor/time, and transactions prevent negative stock. This is a manual supply ledger: orders do not automatically consume materials or enforce catalog stock.
- **Delivery:** Orders distinguish shipping/pickup. USPS, UPS, FedEx, and DHL tracking numbers produce official carrier links in the customer account. Website controls enable pickup with instructions; checkout checks that pickup is available. This does not purchase postage or synchronize carrier statuses automatically.
- **Shop information:** Website controls publish plain-text FAQs, care, turnaround policy, contact details, and pickup instructions on `/shop-info`, linked in the footer. It uses the public cache, invalidated on save.

| Public endpoint group | Per client | Global ceiling |
| --- | --- | --- |
| Checkout | 12 / 10 minutes | 500 / 24 hours |
| Contact | 5 / 10 minutes | 300 / 24 hours |
| Address lookup | 90 / 10 minutes | 2,000 / 24 hours |
| Proof review | 60 / 10 minutes | 5,000 / 24 hours |

PostgreSQL tests verify retry deduplication, changed-key rejection, rate limits, proof secrets/supersession/production blocking, stock underflow rollback, and denied customer access to all private tables/RPCs. Chromium checks cover all eight additions, with no detected axe A/AA violations in tested proof, order, inventory, upload, shop-info, and mobile inventory screens. Live Storage and provider configuration remain unverified.

## Live database status — September 6, 2026

All four September 6 migrations have been applied to Love & Co. (`vouheqlstnftakhlpzmy`) and live grants/RLS verified. Do not rerun them in the SQL Editor. The website code still needs deployment to Vercel. The only WARN/ERROR security-advisor finding is disabled leaked-password protection.
