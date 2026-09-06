# Demo video script — 4:05

Six sections. Narration is written to be read at a normal speaking pace
(~140 words/min); each block is already trimmed to its slot, so read it as
written rather than ad-libbing if you want the timings to hold.

---

## ⚠️ Before you record — read this first

**Razorpay is currently on LIVE keys** (`rzp_live_…`, provider state
`enabled`). A payment in section 5 would be a **real charge on a real
card**. Before recording, either:

- **Recommended** — put test keys (`rzp_test_…`) into Settings → Payment
  Providers → Razorpay and set its state to *Test*. You then pay with
  Razorpay's test card and nothing real moves.
- Or record the checkout page opening and cut before completing payment.
- Or keep live keys and accept a genuine small charge (and refund it after).

### Data to stage before the take

| # | Item | Why | How |
|---|---|---|---|
| 1 | Re-seed the pricing anomaly on **P00054** | Section 6 depends on it; it has since been corrected back to ₹8,500 | See snippet below |
| 2 | Know the portal password for `nimesh.pathak@example.com` | Section 5 signs in as him | Use *Forgot password* → Mailpit at `localhost:8025` if unknown |
| 3 | Have a draft sales order **ready but not created** | Section 5 is tight; know the exact clicks | Dry-run it once first |
| 4 | Clear the assistant chat | Starts on the example prompts | Click the ✎ *New chat* icon |
| 5 | `docker compose up -d` and load every page once | Avoids first-hit compile lag on camera | — |

Re-seed the anomaly:

```bash
docker compose exec -T odoo odoo shell -d urban_furniture \
  --db_host=db --db_user=odoo --db_password=odoo --no-http <<'EOF'
po = env['purchase.order'].search([('name','=','P00054')], limit=1)
po.order_line[0].write({'price_unit': 370000.0})
env.cr.commit()
print("anomaly restored:", po.amount_total)
EOF
```

### Screen setup

- Browser at **1920×1080**, zoom 100%, bookmarks bar hidden, one tab only.
- Have a second window open on `docs/demo-architecture.excalidraw` for §3.
- Sign in as **Admin (`admin`)** before you hit record.

---

## 1 · The problem — 0:00–0:30

**On screen:** title slide, then the requirements page of the spec PDF.

> Urban Furniture is a growing furniture business still keeping its books
> by hand. They need one system that holds their master data — contacts,
> products, chart of accounts, journals — and runs the two flows every
> business lives on: purchase order to vendor bill to payment, and sales
> order to customer invoice to payment.
>
> On top of that: budgets, a balance sheet, a profit and loss. And three
> different people need three different levels of access to all of it.

---

## 2 · What we proposed — 0:30–1:00

**On screen:** the app at `localhost:3000`, Admin dashboard, sitting still.
Don't click anything — let the numbers be the backdrop.

> We didn't rebuild accounting. Odoo 17 Community already does double-entry
> posting and tax correctly, so we reused it as the engine and never touched
> that logic.
>
> What it genuinely lacks, we built: budgets, the three reports, the two
> roles, and customer-vendor typing on contacts. Then we put our own Next.js
> interface in front of all of it, so nobody ever sees an Odoo screen — and
> added an assistant that records transactions from plain English.

---

## 3 · Architecture — 1:00–1:50

**On screen:** `docs/demo-architecture.excalidraw`, full screen. Move the
cursor along each column as you name it — left to right, no zooming.

| Time | Point at |
|---|---|
| 1:00 | the three role chips on the left |
| 1:15 | the Tally Stack UI column |
| 1:28 | the JSON-RPC arrow |
| 1:36 | the two Odoo boxes |
| 1:45 | Postgres, then the footer line |

> Here's the shape of it. On the left, three roles. The Admin owns
> everything and creates the other two logins. The Invoicing User handles
> master data, transactions and reports. The Contact — a customer or vendor
> — only ever sees their own invoices.
>
> They all land in one place: our Next.js app on port 3000. Dashboard,
> master data, both transaction flows, budgets, reports, and the customer
> portal.
>
> It talks to Odoo over JSON-RPC carrying the user's own session — so Odoo's
> own access rules decide what's allowed, not our interface.
>
> Odoo does the accounting. We added the budgets, the reports and the roles
> on top. Everything lands in one Postgres database. Four containers, one
> `docker compose up`.

---

## 4 · Demo 1 — the pages and the logic — 1:50–2:35

**On screen:** the live app. Move briskly; don't linger on any list.

| Time | Do this |
|---|---|
| 1:50 | Dashboard. Hover **Outstanding payable**, click it → the bills page |
| 2:00 | Back. Sidebar → **Contacts**. Open one, show the *Customer / Vendor / Both* type |
| 2:08 | **Products** → **Chart of accounts** → **Journals** → **Analytic accounts** (fast scroll each) |
| 2:16 | **Budgets**. Open one — planned, actual, variance |
| 2:26 | **Reports** → click through the three tabs → hit **Download PDF** on one |

> This is the Admin's dashboard — live figures straight off posted entries.
> Net position, outstanding receivable and payable, both pipelines. The
> cards are clickable, so outstanding payable takes you to exactly the bills
> you owe.
>
> Master data first. Contacts, each typed as customer, vendor or both.
> Products. The chart of accounts, the journals, and the analytic accounts
> we tag transactions against.
>
> Now the part Odoo Community doesn't ship — budgets. You set a planned
> amount against an analytic account and a period. Actual isn't typed in;
> it's computed from the real posted entries. Variance follows.
>
> And the three reports — balance sheet, profit and loss, budget — each
> downloadable as a PDF.

---

## 5 · Demo 2 — sales flow and Razorpay — 2:35–3:20

**On screen:** the full cycle, Admin → customer. This is the tightest
section; a jump cut while Razorpay's page loads is fine.

| Time | Do this |
|---|---|
| 2:35 | **Sales** → **New order** → Nimesh Pathak, Office Chair × 5 → Create |
| 2:44 | Point at the two badges: **Status** and **Billing** |
| 2:50 | **Confirm** → status flips to *Sale*, billing to *To invoice* |
| 2:56 | **Create invoice** → posted. Open **Journal entries**, show the debit/credit lines |
| 3:04 | Sign out → sign in as `nimesh.pathak@example.com` |
| 3:09 | Portal invoice → **Pay now** → Razorpay checkout → complete |
| 3:15 | Back to the invoice — now **Paid**. Cut to dashboard, receivable dropped |

> Full sales cycle. New order for Nimesh Pathak, five office chairs.
>
> Notice there are two separate statuses — the order state, and the billing
> state. "Sale" doesn't mean paid, and we show that explicitly rather than
> letting one badge imply the other.
>
> Confirm it. Create the invoice — Odoo posts it and writes the journal
> entries. There they are: debits and credits, balanced, generated by Odoo,
> not by us.
>
> Now switch to the customer. Nimesh signs in and sees only his own
> invoices. He hits Pay now — that's Razorpay checkout. Payment goes
> through, the invoice flips to Paid, and the dashboard's receivable drops.

---

## 6 · Demo 3 — the AI assistant — 3:20–4:05

**On screen:** back as Admin. Open the assistant (brass button, bottom
right). Chat should be empty.

| Time | Do this |
|---|---|
| 3:20 | Click the example prompt *"Create a purchase order for Rahul Sharma for 10 Wooden Tables"* |
| 3:30 | Let the proposal card render. **Pause on it** — this is the point of the section |
| 3:36 | Click **Confirm** → order created |
| 3:42 | Type *"Check the draft orders for pricing anomalies"* |
| 3:52 | It reports P00054. Reply *"Yes, propose the correction"* → card appears |
| 4:00 | **Confirm** → corrected. Follow-up chips appear |

> Last piece — the assistant. I'll type this in plain English: create a
> purchase order for Rahul Sharma for ten wooden tables.
>
> It resolves the vendor and the product, then stops and shows a proposal.
> It hasn't written anything yet — that's deliberate. The model never
> touches the database directly. I press Confirm, and only then does the
> order get created.
>
> It also watches for mistakes. Check the draft orders for pricing
> anomalies. It finds this one — a wooden table priced at three lakh
> seventy thousand against a catalogue price of eight and a half thousand —
> and offers the correction. Confirm, and it's fixed.

---

## If you overrun

Trim in this order — these cost the least:

1. §4, the master-data sweep (2:08–2:16) — cut to two screens instead of four.
2. §5, the journal entries look (2:56) — mention them without navigating.
3. §6, the purchase-order half — open on the anomaly instead; it's the
   stronger of the two and needs no setup beyond the seed.

Never cut the proposal-card pause at 3:30 or the two-badge point at 2:44 —
both are the "we thought about this" moments.
