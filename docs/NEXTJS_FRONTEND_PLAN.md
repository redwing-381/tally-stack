# Next.js Frontend — Implementation Plan

The core pipeline (`docs/ARCHITECTURE.md`, `docs/COMPONENT_TASKS.md`) is done and
live-verified — all 7 flows work end to end against Odoo's native web client.
This document plans an **expanded, optional Phase 2**: a custom Next.js
frontend layered on top of that working backend, not a replacement for it.
CLAUDE.md's original Phase 2 ("UI polish — inherited view tweaks") undersold
what's actually being proposed here; treat this doc as superseding that phase's
scope, not extending it.

This is strictly additive. Nothing in `addons/urban_furniture_accounting/` or
the existing `db`/`odoo` services in `docker-compose.yml` changes. The native
Odoo UI and portal stay exactly as they are today as the fallback demo path if
this isn't finished in time.

Two things below were confirmed by reading the actual installed Odoo 17
source inside the running container — not assumed:

- **`sale.order._create_invoices` is a private method.** Odoo's RPC layer
  rejects any leading-underscore method name (`AccessError: Private methods
  ... cannot be called remotely`). The Sales → Invoice flow must go through
  the same wizard the native "Create Invoice" button opens
  (`sale.advance.payment.inv`), whose public `create_invoices()` method is
  what's actually callable.
- `purchase.order.button_confirm` and `action_create_invoice` are both
  public — Purchases is the simpler, direct flow.

The Portal/Customer persona is explicitly **out of scope** (see Section 10) —
Odoo's own portal already handles it correctly and is live-verified.

---

## 1. Stack & Repo Layout

**What it is:** a new top-level `frontend/` directory, sibling to `addons/`,
so the Odoo module and the Next.js app are clearly separate deployable units
in the same repo.

```
tally-stack/
├── addons/urban_furniture_accounting/   (untouched)
├── docker-compose.yml                   (extended, see Section 4)
├── docs/NEXTJS_FRONTEND_PLAN.md         (this doc)
└── frontend/                            (new)
    ├── package.json, next.config.ts, tsconfig.json, tailwind.config.ts
    ├── middleware.ts
    ├── app/
    │   ├── login/page.tsx
    │   ├── (app)/                        route group requiring a session
    │   │   ├── layout.tsx                 sidebar + persona-gated nav
    │   │   ├── dashboard/page.tsx
    │   │   ├── contacts/page.tsx
    │   │   ├── contacts/[id]/page.tsx
    │   │   ├── sales/page.tsx
    │   │   ├── sales/[id]/page.tsx
    │   │   ├── purchases/page.tsx
    │   │   ├── purchases/[id]/page.tsx
    │   │   ├── budgets/page.tsx
    │   │   ├── budgets/[id]/page.tsx
    │   │   └── reports/
    │   │       ├── balance-sheet/page.tsx
    │   │       └── profit-loss/page.tsx
    │   └── api/
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── odoo/call/route.ts         generic call_kw proxy (client reads only)
    │       └── dashboard/summary/route.ts aggregator (Section 5)
    ├── lib/
    │   ├── odoo/client.ts                 server-only callKw() wrapper
    │   ├── odoo/session.ts                cookie + persona helpers
    │   ├── odoo/actions.ts                Server Actions for mutations
    │   └── odoo/types.ts
    └── components/
        ├── nav/Sidebar.tsx
        ├── ui/... (shadcn)
        └── charts/... (Tremor)
```

**Stack:** Next.js (App Router, TypeScript) + Tailwind + shadcn/ui for
forms/tables/dialogs + Tremor for KPI cards and charts (Tailwind+Recharts
based, composes cleanly with shadcn — no second design system to fight).

**Data-fetching split:** Server Components call `lib/odoo/client.ts` directly
for all initial page reads — no self-hosted HTTP hop, no client waterfalls.
Mutations (confirm order, register payment, generate report, save budget) go
through **Server Actions** in `lib/odoo/actions.ts` — typed, co-located,
CSRF-protected by Next.js by default. The one generic `/api/odoo/call` route
is reserved for imperative client-side reads only (e.g. debounced
partner/product/analytic-account autocomplete pickers).

**Visual design:** this is an internal accounting tool, not a marketing
site — ground the palette/type in that (dense tables, real numbers, restrained
material feel; one deliberate accent color used only for state, not
decoration). Avoid generic AI-template tells: no cream+terracotta palette, no
identical-rounded-card SaaS kit look, no gratuitous numbered 01/02/03 section
markers. Spend visual boldness on one thing — the Dashboard's KPI row is the
natural candidate — and keep every list/form screen quiet and legible, since
these get used under time pressure during a live demo.

| Task | Est. | Depends on |
|---|---|---|
| `npx create-next-app` scaffold in `frontend/`, TS + Tailwind + App Router | 20m | — |
| Install/wire shadcn/ui (button, input, table, dialog, form, dropdown) | 30m | above |
| Install Tremor, confirm it composes with shadcn's Tailwind config | 20m | above |
| Design pass: palette/type tokens applied to a base layout shell | 45m | above |
| `lib/odoo/types.ts`: TS interfaces for Budget, Partner, SaleOrder, PurchaseOrder, AccountMove, ReportLine | 30m | — |

**Total: ~2.5h.** Front-load this — everyone else builds on the shell and types.

---

## 2. Auth & Session Proxy Layer

**What it is:** the browser never talks to Odoo. Every request goes browser →
Next.js Route Handler/Server Component (same-origin) → Odoo JSON-RPC
(server-to-server, `http://odoo:8069`). This eliminates CORS entirely and
keeps the real Odoo session cookie httpOnly and server-side only.

```
Browser                     Next.js server                         Odoo
  │  POST /api/auth/login     │                                      │
  ├──────────────────────────>│  POST /web/session/authenticate      │
  │                           ├─────────────────────────────────────>│
  │                           │<── Set-Cookie: session_id=...  ──────┤
  │                           │  (parallel) resolve persona (Sec. 3) │
  │  Set-Cookie: ufa_session, │                                      │
  │  ufa_persona (httpOnly)   │                                      │
  │<──────────────────────────┤                                      │
  │  every later page/action  │                                      │
  ├──────────────────────────>│  Cookie: session_id=<value>          │
  │                           ├─────────────────────────────────────>│
```

**Login** — `app/api/auth/login/route.ts` (POST, body `{login, password}`)
calls:

```
POST http://odoo:8069/web/session/authenticate
{"jsonrpc":"2.0","method":"call","params":{"db":"urban_furniture","login":"<login>","password":"<password>"}}
```

On success: reads the `session_id` cookie off Odoo's response, resolves
persona in parallel (Section 3), sets `ufa_session` (httpOnly, secure,
sameSite=lax — the raw Odoo `session_id`) and `ufa_persona` (httpOnly, value
`admin|invoicing|portal`) on the Next.js response, and returns
`{ok, persona, name}` to the browser. The raw session id is never exposed to
browser JS.

**Per-request proxying** — `lib/odoo/client.ts`:

```ts
async function callKw(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const sid = cookies().get("ufa_session")?.value;
  const res = await fetch(`${process.env.ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `session_id=${sid}` },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { model, method, args, kwargs } }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new OdooRpcError(json.error);
  return json.result;
}
```

Server Components and Server Actions import this directly. `/api/odoo/call`
is a thin wrapper around the same function for client-side-initiated reads.

**Logout** — `app/api/auth/logout/route.ts` calls
`POST http://odoo:8069/web/session/destroy` with the forwarded cookie, then
clears `ufa_session`/`ufa_persona` on the response regardless of Odoo's reply
(never leave the app stuck logged-in client-side if Odoo's session already
expired).

**Middleware** — `middleware.ts` checks for `ufa_session` on every request
except `/login` and `/api/auth/*`; missing cookie redirects to
`/login?next=<path>`. It does **not** re-validate against Odoo on every
request — real enforcement is Odoo's own ACLs/record rules on every proxied
`call_kw`, so a stale or forged persona cookie can only change what nav items
*render*, never what data can actually be read or written. The persona
cookie is a UX/nav convenience, not the security boundary.

| Task | Est. | Depends on |
|---|---|---|
| `lib/odoo/client.ts` — `callKw` wrapper + typed `OdooRpcError` | 45m | Section 1 types |
| `app/api/auth/login/route.ts` (authenticate + cookie extraction + persona resolution) | 1h | Section 3 |
| `app/api/auth/logout/route.ts` | 20m | above |
| `middleware.ts` cookie-presence gate + redirect | 20m | login route |
| `app/login/page.tsx` — form, calls `/api/auth/login`, redirects by persona | 40m | above |
| `app/api/odoo/call/route.ts` generic proxy for client-side reads | 20m | client.ts |

**Total: ~3.25h.** Every screen depends on this — build and verify it
(Section 11's curl test) before any screen work starts.

---

## 3. Persona / Nav Gating

**What it is:** after login, resolve which persona (Admin, Invoicing User, or
Portal/Customer) the logged-in `res.users` is, using data already in the
system — no new backend fields.

**Group id resolution (once, cached):**

```
call_kw: model="ir.model.data", method="search_read",
  args=[[["module","=","urban_furniture_accounting"],
         ["name","in",["group_urban_admin","group_urban_invoicing_user"]]],
        ["name","res_id"]]
```

These ids are static for the life of the database — resolve once and cache
in `lib/odoo/session.ts` rather than re-querying on every login.

**Per-user persona check**, run in parallel with the group-id lookup on first
login:

```
call_kw: model="res.users", method="read",
  args=[[<uid>], ["share", "groups_id", "name", "login"]]
```

Decision logic:

- `share === true` → **Portal/Customer**. `share` is Odoo's own
  computed/stored boolean, true for portal/public users — a more direct
  signal than resolving `base.group_portal`'s xmlid.
- `share === false` and `groups_id` contains the `group_urban_admin` res_id
  → **Admin**.
- `share === false` and `groups_id` contains the
  `group_urban_invoicing_user` res_id → **Invoicing User**.
- `share === false` and neither → fail closed: no Urban Furniture nav shown,
  generic "contact an admin" state — never guess.

The resolved persona is written into `ufa_persona` at login and read by
`app/(app)/layout.tsx` to render `components/nav/Sidebar.tsx`:

- **Admin** — Dashboard, Contacts, Sales, Purchases, Budgets (full CRUD incl.
  delete), Reports.
- **Invoicing User** — same nav, but the Budgets screen hides/disables
  Delete client-side, mirroring `ir.model.access.csv`'s `perm_unlink=0` for
  that group. This is UX-only — Odoo rejects the unlink RPC regardless.
- **Portal/Customer** — never reaches this app; see Section 10.

| Task | Est. | Depends on |
|---|---|---|
| `lib/odoo/session.ts`: group-id resolver + in-memory cache | 30m | Section 2 client.ts |
| Persona classification function (`share` + groups_id logic above) | 30m | above |
| `components/nav/Sidebar.tsx` persona-driven nav rendering | 45m | above |
| Budget delete-button gating for Invoicing User persona | 15m | Section 8 |

**Total: ~2h.**

---

## 4. Docker Wiring

**What it is:** one new `frontend` service added to the existing
`docker-compose.yml` — nothing else touched.

```yaml
services:
  db: ...        # unchanged
  odoo: ...      # unchanged
  frontend:
    build: ./frontend
    depends_on:
      - odoo
    ports:
      - "3000:3000"
    environment:
      ODOO_URL: http://odoo:8069
      ODOO_DB: urban_furniture
```

No explicit `networks:` block needed — it joins the same default bridge
network as `db`/`odoo` and reaches Odoo by service name, exactly like `odoo`
reaches `db` today. `ODOO_DB` matches the database name already in use.

| Task | Est. | Depends on |
|---|---|---|
| `frontend/Dockerfile` (multi-stage Next.js build) | 30m | Section 1 scaffold |
| Add `frontend` service to `docker-compose.yml`, env vars | 15m | above |
| `docker compose up -d` end-to-end: confirm `frontend` reaches `odoo:8069` server-side | 15m | above |

**Total: ~1h.**

---

## 5. Dashboard

**What it is:** the one screen with no direct Odoo analog — a KPI/chart
landing page assembled from several models in one request.

Server-side aggregation happens in `app/api/dashboard/summary/route.ts`
using `Promise.all` (no browser-side waterfalls) — **not** a new Odoo
controller, since everything it needs is already readable:

- `ufa.budget` — `actual_amount` is computed and non-stored, so budgets must
  be `search_read` in full and summed in the handler, not `read_group`'d.
- `sale.order` — `read_group` by `state` for order-pipeline counts.
- `purchase.order` — `read_group` by `state`.
- `account.move` — `read_group` by `payment_state`, filtered
  `move_type in ('out_invoice','in_invoice')`, for outstanding
  receivables/payables.

| Task | Est. | Depends on |
|---|---|---|
| `/api/dashboard/summary` aggregator route (parallel read_groups) | 1h | Section 2 |
| Dashboard page: Tremor KPI cards (outstanding receivable/payable, open SO/PO counts) | 1h | above |
| Budget planned-vs-actual bar chart (Tremor `BarChart`) | 45m | above |
| Empty/loading states | 20m | — |

**Total: ~3h.**

---

## 6. Sales (Order → Invoice → Payment)

**What it is:** list + detail for `sale.order`, with confirm/invoice/pay as
Server Actions. This is the trickiest flow in the plan — the exact sequence,
verified against the installed Odoo 17 source:

```
1. Confirm:
   callKw("sale.order", "action_confirm", [[orderId]])

2. Create invoice — do NOT call sale.order._create_invoices (private, RPC-blocked).
   Use the same wizard the native "Create Invoice" button opens:
   a. wizardId = callKw("sale.advance.payment.inv", "create", [{}],
        { context: { active_model: "sale.order", active_ids: [orderId], active_id: orderId } })
      // advance_payment_method defaults to "delivered" (full invoice, no
      // down-payment UI needed) — exactly what this flow requires.
   b. callKw("sale.advance.payment.inv", "create_invoices", [[wizardId]],
        { context: { active_model: "sale.order", active_ids: [orderId] } })

3. Find the resulting invoice(s):
   callKw("sale.order", "read", [[orderId], ["invoice_ids"]])

4. Post it:
   callKw("account.move", "action_post", [invoiceIds])
```

Register Payment on the resulting invoice reuses the shared flow in
Section 7.

| Task | Est. | Depends on |
|---|---|---|
| Sales list (Server Component, `search_read` sale.order) | 30m | Section 2 |
| Sales detail page + line items table | 45m | above |
| New/edit order form (partner picker, product lines) | 1.5h | above |
| `confirmOrder` / `createInvoice` Server Actions per the sequence above | 1h | above |
| Post + Register Payment buttons on the resulting invoice (reuses Section 7) | 20m | Section 7 |

**Total: ~4h.**

---

## 7. Purchases (Order → Bill → Payment)

**What it is:** mirror of Sales, simpler — both `purchase.order` methods are
public.

```
1. Confirm:      callKw("purchase.order", "button_confirm", [[orderId]])
2. Create bill:  callKw("purchase.order", "action_create_invoice", [[orderId]])
3. Find bill:    callKw("purchase.order", "read", [[orderId], ["invoice_ids"]])
4. Post it:      callKw("account.move", "action_post", [billIds])
```

**Register Payment** (shared helper, used by both Sales and Purchases, on
any posted `account.move`):

```
1. wizardId = callKw("account.payment.register", "create", [{}],
     { context: { active_model: "account.move", active_ids: [moveId], active_id: moveId } })
2. callKw("account.payment.register", "action_create_payments", [[wizardId]],
     { context: { active_model: "account.move", active_ids: [moveId] } })
3. Re-read: callKw("account.move", "read", [[moveId], ["payment_state", "amount_residual"]])
   → confirm payment_state flips to "paid" or "in_payment"
```

(Confirmed against `account.payment.register`'s `default_get`, which
branches on `active_model == 'account.move'` and reads lines from the
browsed moves directly — no need to pass line ids.)

| Task | Est. | Depends on |
|---|---|---|
| Purchases list + detail (mirrors Sales) | 1h | Section 2 |
| New/edit PO form | 1h | above |
| `confirmPO` / `createBill` Server Actions | 45m | above |
| Shared `registerPayment(moveId)` Server Action (used by both Sales and Purchases) | 45m | above |
| Payment dialog UI (amount/journal/date, defaults from wizard `default_get`) | 45m | above |

**Total: ~4.25h.**

---

## 8. Contacts & Budgets

**What it is:** Contacts is a straightforward CRUD screen over
`res.partner` + `partner_type`; Budgets is CRUD over `ufa.budget` plus the
planned-vs-actual chart, with the no-unlink constraint from Section 3
enforced in the UI.

Contact writes must **only** set `partner_type` — never touch
`customer_rank`/`supplier_rank` directly, since `res.partner.write()`
already auto-syncs those from `partner_type` server-side. Setting them from
the frontend would be redundant and risks fighting the model's own sync
logic.

Budget `actual_amount`/`variance` are computed and non-stored — every
list/detail render must `search_read` fresh; there's no stored field to
sort/filter on server-side, so any Actual/Variance sort happens client-side
on the fetched page only (fine at hackathon data volumes).

| Task | Est. | Depends on |
|---|---|---|
| Contacts list + filter (customer/vendor/both) | 45m | Section 2 |
| Contact detail/edit form (sets `partner_type` only) | 45m | above |
| Budgets list (Server Component `search_read`, incl. computed fields) | 30m | above |
| Budget create/edit form (analytic account picker, period, planned amount) | 1h | above |
| Budget planned-vs-actual chart on the list page (Tremor, reuse Section 5 work) | 30m | Section 5 |
| Delete button hidden/disabled for Invoicing User persona | 15m | Section 3 |

**Total: ~3.5h.**

---

## 9. Reports (Balance Sheet & Profit and Loss)

**What it is:** the `ufa.financial.report.wizard` TransientModel flow driven
headlessly instead of through Odoo's own `target: new` popup — one wizard
record per screen session, edited and re-triggered rather than recreated on
every date change.

```
On first load / first "Generate":
  wizardId = callKw("ufa.financial.report.wizard", "create",
    [{ report_type: "balance_sheet" | "profit_loss", date_to: <iso date>,
       date_from: <iso date or false> }])
  callKw("ufa.financial.report.wizard", "action_generate", [[wizardId]])

On subsequent date changes (same screen session):
  callKw("ufa.financial.report.wizard", "write",
    [[wizardId], { date_to: <new date>, date_from: <new date or false> }])
  callKw("ufa.financial.report.wizard", "action_generate", [[wizardId]])

Read results after either path:
  callKw("ufa.financial.report.wizard", "read", [[wizardId], ["net_result", "currency_id"]])
  callKw("ufa.financial.report.line", "search_read",
    [[["wizard_id", "=", wizardId]], ["section", "account_id", "balance"]])
```

`account_id` comes back as a `[id, display_name]` pair in `search_read`
results, so no extra join call is needed for labels. `date_from` is only
meaningful for P&L — the Balance Sheet screen never sends it (server-side,
`action_generate` already ignores it for `balance_sheet`). The wizard is a
`TransientModel`; Odoo's own vacuum cron reclaims it — no explicit cleanup
call is required.

| Task | Est. | Depends on |
|---|---|---|
| Shared `ReportWizard` Server Action (create/write + action_generate + reads above) | 1h | Section 2 |
| Balance Sheet page (Date To picker, grouped-by-section table, Generate button) | 45m | above |
| P&L page (Date From/To, same table shape + Net Result banner) | 45m | above |
| Section grouping/labels (Assets/Liabilities/Capital/Income/Expenses) rendering | 30m | above |

**Total: ~3h.**

---

## 10. Portal/Customer Persona — Deferred

**Decision:** the Contact/Customer persona is **out of scope** for this
Next.js app. Odoo's native portal (`/my`) already implements this correctly
and is live-verified (`docs/TESTING_GUIDE.md` Flow 7 — direct-URL access to
another customer's invoice is blocked/redirected). Rebuilding it in Next.js
would mean re-implementing per-record access scoping that Odoo's `ir.rule`s
already give for free, for zero net new capability.

Concretely: when the persona resolver (Section 3) returns `portal`, the
login success handler redirects the browser straight to the public Odoo
host's `/my` instead of into `(app)/`. This Next.js app is purely the
Admin/Invoicing User tool.

| Task | Est. | Depends on |
|---|---|---|
| Redirect-to-native-portal branch in the login success handler | 15m | Section 3 |
| One-line note in the app's own nav/docs that Portal users are served by Odoo directly | 5m | — |

**Total: ~20m.**

---

## 11. Verification Plan

**Level 1 — Proxy layer, before any screen exists:**

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin"}'
# expect {"ok":true,"persona":"admin",...} and a Set-Cookie for ufa_session/ufa_persona

curl -b cookies.txt -X POST http://localhost:3000/api/odoo/call \
  -H "Content-Type: application/json" \
  -d '{"model":"ufa.budget","method":"search_read","args":[[],["name","planned_amount"]],"kwargs":{}}'
# expect the seeded "Q1 Furniture Budget" record
```

Repeat with `test.invoicing@example.com`/`Invoice123!` and confirm
`persona: "invoicing"`; repeat with `nimesh.pathak@example.com`/`Portal123!`
and confirm `persona: "portal"` plus the redirect-to-`/my` behavior from
Section 10.

**Level 2 — Per-flow RPC shape checks**, done once each directly against the
running container before wiring any UI, to de-risk Sections 6/7/9
specifically:

- Sales: confirm → `sale.advance.payment.inv` create/create_invoices →
  verify a new `account.move` with `move_type=out_invoice` appears in
  `sale.order.invoice_ids`, post it, confirm `state='posted'`.
- Purchases: `button_confirm` → `action_create_invoice` → verify
  `in_invoice` appears, post it.
- Payment: `account.payment.register` create + `action_create_payments` on
  each posted move → re-read `payment_state` flips to `paid`/`in_payment`.
- Reports: create wizard, `action_generate`, `search_read` on
  `ufa.financial.report.line` → confirm non-zero balances after Level-2
  Sales/Purchases runs have posted real entries.

**Level 3 — Manual click-through per screen**, against the running
`docker compose` instance (`localhost:8069` Odoo + `localhost:3000`
frontend), one pass per persona:

- Admin: every nav item visible, full Budget CRUD including delete.
- Invoicing User: Budget delete button absent/disabled; attempt a direct
  budget-delete Server Action call anyway (e.g. via devtools) and confirm
  Odoo itself rejects it (`perm_unlink=0`) — an explicit break-test, not
  just a happy-path check.
- Portal: login redirects straight to native `/my`, no Next.js internal
  screen ever renders for this persona.
- Full Sales and Purchase pipelines run end-to-end from the Next.js UI,
  cross-checked against the same records visible in the native Odoo backend
  to confirm the frontend isn't diverging from ledger reality.

| Task | Est. | Depends on |
|---|---|---|
| Level 1 curl script, run once per persona | 30m | Section 2 |
| Level 2 RPC shape checks for Sales/Purchase/Payment/Reports | 1h | Sections 6, 7, 9 built |
| Level 3 full click-through, 3 personas | 1h | all screens built |

**Total: ~2.5h.**

---

## Suggested Ownership

Total scope across Sections 1–11 is roughly **25–26h** — too much for one
person, but this is explicitly optional, scope-permitting work layered on an
already-graded, already-verified core pipeline. Section 2 (auth/proxy) is
the hard dependency everyone else needs, so whoever is fastest should take
it first; after that, Sales/Purchases/Payments (Sections 6–7) is the
single densest, highest-risk piece (the private-method gotcha, multi-step
wizard flows) and deserves the most runway.

| Person | Primary component(s) | Why |
|---|---|---|
| Person A | 1 (scaffold/stack) → 2 (auth/proxy) → 4 (Docker) | Unblocks everyone else fastest; owns the one shared dependency |
| Person B | 3 (persona/nav) → 6 + 7 (Sales, Purchases, Payments) | Heaviest, highest-risk RPC sequencing — give it the most time |
| Person C | 5 (Dashboard) → 8 (Contacts, Budgets) → 9 (Reports) | Independent screens once Section 2 lands; can start as soon as `callKw` exists |
| Whoever finishes first | 10 (portal redirect) then 11 (verification pass) | 10 is trivial; 11 needs at least two personas' work done to be meaningful |
