# Architecture — Urban Furniture Accounting

Source spec: `docs/Urban Furniture Accounting System.pdf`. This doc is the
detailed "why" behind `CLAUDE.md`'s rules — read that first for the quick
version.

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| Odoo edition | Community | Free, self-hosted, no license dependency for the hackathon |
| UI | Stock Odoo backend + native Portal | Fastest, most reliable; PDF explicitly says "business logic focus... not just UI screens" |
| Environment | Local Docker Compose | Fully in our control, no dependency on venue wifi or external hosting |
| AI agent | Deferred to phase 3, after core pipeline works | Own added scope beyond the spec; don't let it risk the graded core flow |

## What's native (zero custom code)

| Spec item | Odoo model | Notes |
|---|---|---|
| Purchase Order → Vendor Bill → Payment | `purchase.order` → `account.move` (in_invoice) → `account.payment` | Native buttons: Create Bill, Register Payment |
| Sales Order → Customer Invoice → Payment | `sale.order` → `account.move` (out_invoice) → `account.payment` | Same pattern |
| Journal Entries (debit/credit) | `account.move.line` | Auto-posted when invoice/bill is confirmed |
| Journals (Sales/Purchase/Bank/Cash) | `account.journal` | Created automatically with the Chart of Accounts |
| Chart of Accounts | `account.account` | Pick a generic CoA template on DB init; rename a few accounts to match the spec's exact labels (Cash, Bank, Debtors, Creditors, Sale Income, Purchase Expense) |

The entire transaction flow needs no Python — it's app installation +
configuration + demo data. Budget the team's time accordingly: most
custom effort belongs in security and reporting, not transactions.

## What we extend or build

- **Contact** (`res.partner`): add `partner_type` (Customer/Vendor/Both)
  selection field; on save, set `customer_rank`/`supplier_rank` so native
  Odoo filters (Customers list, Vendors list) keep working.
- **Product** (`product.template`): no changes — native fields (name,
  type, sales price, cost, category) already cover the spec.
- **Analytic Account**: native (`account.analytic.account`), just needs
  enabling in Settings.
- **Budget** (new model): `Budget Name`, `Period`, `Responsible Person`,
  `Analytic Account`, `Planned Amount`, computed `Actual Amount` (sum of
  `account.move.line` for that analytic account within the period).
  Community has no equivalent — this is genuinely new engineering.
- **Reports** (new, custom): Balance Sheet, P&L, Budget Report. One wizard
  pattern reused three times — pick a date range, query
  `account.move.line` joined to `account.account`, group by account
  type, render as a list/pivot. Built ourselves because Community lacks
  the Enterprise dynamic reporting engine (`account_reports`), and it
  keeps report content fully in our control for the demo.

## Security → composed from Odoo's existing groups

- **Admin**: implies `account.group_account_manager` +
  `sales_team.group_sale_manager` + `purchase.group_purchase_manager` +
  `base.group_partner_manager`.
- **Invoicing User**: implies `account.group_account_invoice` (Odoo's
  native "Billing" role, built for exactly this persona) +
  `sales_team.group_sale_salesman` + `purchase.group_purchase_user`.
- **Contact**: native `base.group_portal`. Odoo's portal already scopes
  customers/vendors to their own invoices/bills by default — verify this
  holds during the first build hour rather than assume it; add a
  tightening `ir.rule` only if the default scoping proves insufficient.

## Suggested task split (6-8h core pipeline, 3 people)

1. Master data + security (Contact extension, 2 groups, portal scoping
   verification)
2. Transaction flow + CoA/journal setup (mostly configuration + demo
   data seeding matching the PDF's own examples — Rahul Sharma, Nimesh
   Pathak, Office Chair)
3. Budget model + all 3 reports (the one genuinely code-heavy piece)

## Open questions (resolve before/during implementation, not now)

- Exact shape of the AI agent (natural-language transaction entry is the
  current lead direction — see project memory) — not finalized.
- Whether Odoo's default portal record rules on `account.move` are
  sufficient as-is or need a custom `ir.rule` — verify empirically once
  the container is up, don't assume either way.
