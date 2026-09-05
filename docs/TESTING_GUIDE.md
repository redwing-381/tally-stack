# Manual Testing Guide

App running at **http://localhost:8069**, database `urban_furniture`,
module already installed. All 7 flows below have already been verified
once (by me, live, in a real browser) — this doc is so you can repeat
them yourself and get familiar with the app before the real demo.

**Admin login:** `admin` / `admin`

---

## Flow 1 — Login & find the right menu

**Proves:** the module installed and its menu is reachable.

1. Open http://localhost:8069, log in `admin` / `admin`.
2. Click the app-switcher grid icon (top left) → click **Invoicing**.

   ⚠️ **Not "Accounting."** There are two similar-looking tiles. "Accounting"
   is Odoo's Enterprise app and isn't installed here — clicking it just
   nags you to upgrade, that's expected and not a bug. Our module's menus
   live under **Invoicing**.
3. In the top nav bar you should now see: Customers, Vendors, Reporting,
   and **Urban Furniture**. Click **Urban Furniture** → confirm you see
   **Budgets**, **Balance Sheet**, **Profit & Loss**.

---

## Flow 2 — Master data sanity check

**Proves:** our Contact and Product seed data loaded correctly.

1. **Contacts app** → search "Rahul Sharma" → open it → confirm **Contact
   Type = Vendor** is visible on the form.
2. Search "Nimesh Pathak" → confirm **Contact Type = Customer**.
3. **Invoicing → Customers → Products** (or Sales app → Products) →
   search "Office Chair".

   ⚠️ **Two results will show up.** One is ours (₹3,500 list price / ₹2,200
   cost), the other is Odoo's own built-in demo product with the same
   name — a coincidence, not our bug. If it matters which one you pick in
   a later flow, check the price matches ours: Office Chair ₹3,500 /
   Wooden Table ₹8,500 / Sofa ₹18,000 / Dining Table ₹15,000.

---

## Flow 3 — Purchase: buying from a vendor ✅ *(you already confirmed this works)*

**Proves:** PO → Bill → Payment posts real ledger entries.

1. **Purchase app → New**
2. Vendor: **Rahul Sharma**. Add a line: **Office Chair** (ours), qty 5.
3. **Confirm Order** (top left button).
4. **Create Bill** → opens a Vendor Bill → set **Bill Date** to today →
   **Confirm**.
5. **Register Payment** → accept defaults → **Create Payment**.
6. Check: the bill's status badge reads **Paid**.

---

## Flow 4 — Sales: selling to a customer ✅ *(you already confirmed this works)*

**Proves:** SO → Invoice → Payment, the mirror of Flow 3.

1. **Sales app → New**
2. Customer: **Nimesh Pathak**. Add a line: **Office Chair**, qty 5.
3. **Confirm**.
4. **Create Invoice** → **Create and View Invoice** → set Invoice Date →
   **Confirm**.
5. **Register Payment** → **Create Payment**.
6. Check: invoice status badge reads **Paid**.

---

## Flow 5 — Budget: planned vs actual

**Proves:** our one fully custom model (Odoo Community has no Budget app).

1. **Invoicing → Urban Furniture → Budgets** — you'll already see one
   record: **"Q1 Furniture Budget"**, Planned 10,000 / Actual 0 / Variance
   10,000 (created during testing).
2. Click **New** to make your own: any name, **Analytic Account =
   General** (seeded for you), a period, a **Planned Amount**.
3. Save. **Actual Amount** will show **0** unless a transaction's line has
   its **Analytic Distribution** set to "General" — Flows 3/4 above don't
   set this, so 0 is correct, not broken.

---

## Flow 6 — Reports ✅ *(confirmed live — real numbers render correctly)*

**Proves:** Balance Sheet and P&L pull real numbers from what's been
posted.

1. **Invoicing → Urban Furniture → Balance Sheet** → confirm/adjust
   **Date To** → **Generate**. You'll see Asset/Liability lines with real
   balances (Bank, Outstanding Receipts/Payments, Tax Paid, etc.).
2. **Invoicing → Urban Furniture → Profit & Loss** → set a date range
   spanning today → **Generate**. Expect an Income line (~20,000 from the
   sale), an Expense line, and a **Net Result**.

---

## Flow 7 — Access control ✅ *(confirmed live, rigorously — see below)*

**Proves:** the 3 personas genuinely see different things. This was the
one real unknown, and it's now the most thoroughly tested flow — both
list-level and by attempting a direct-URL bypass.

Two test accounts already exist and are ready to use — no setup needed:

| Account | Login | Password | Persona |
|---|---|---|---|
| Portal (customer) | `nimesh.pathak@example.com` | `Portal123!` | Contact |
| Invoicing User | `test.invoicing@example.com` | `Invoice123!` | Invoicing User |

**Try it yourself:**

1. Log out of admin. Log in as `nimesh.pathak@example.com` / `Portal123!`.
   You land on a **portal page** ("My account"), not the internal backend
   — portal users can't reach it at all.
2. Click **Your Invoices** → you'll see exactly 2 invoices, both his own,
   both Paid. There's a 3rd invoice in the system (belongs to "Other
   Customer Pvt Ltd", created during testing) — it will **not** appear
   here, confirming the isolation.
3. Log out, log in as `test.invoicing@example.com` / `Invoice123!`. Check
   the app switcher: you'll see Contacts/Sales/Invoicing/Purchase, but
   **no Settings app** — this persona can transact but not administer.
4. Log back in as `admin`/`admin` when done.

**What I already tried and confirmed, so you don't have to:** manually
navigating to `/my/invoices/<id>` of the other customer's invoice as
Nimesh — Odoo silently redirected back to "My account" instead of
leaking any data. That's the real security property, not just a filtered
list.

---

## Quick reference: what "demo-ready" looks like end to end

Flow 3 paid → Flow 4 paid → Flow 6 shows non-zero numbers on both
reports → Flow 7's portal user sees only their own invoice. All four
already hold as of this testing session.
