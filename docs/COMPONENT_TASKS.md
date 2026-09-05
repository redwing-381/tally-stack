# Component Architecture & Task Breakdown

Drills into each of the 5 components from `docs/architecture.excalidraw` (v1).
Each section: what's inside it, how the pieces connect, and the concrete
tasks to build it. Time estimates are rough, for sequencing/ownership
decisions, not commitments.

---

## 1. Access & Persona Layer

**What it is:** the boundary that decides what each of the 3 logged-in
users can see and do. This is the *behavior* to verify — the actual
groups/rules are implemented as part of Component 3.

```
Admin user ───┐
Invoicing user├──> Odoo Backend UI (menus filtered by group)
Contact user ─┴──> Odoo Portal (sees only own invoices/bills)
```

| Task | Est. | Depends on |
|---|---|---|
| Create 3 demo users, one per persona, assign the right group/portal access | 15m | Groups exist (Component 3) |
| Verify Admin sees all menus (Accounting, Sales, Purchase, Contacts, Settings) | 10m | above |
| Verify Invoicing User can create/record but not access admin-only settings | 15m | above |
| Verify Contact portal user sees *only* their own invoices/bills, nothing else | 20m | above — this is the one to actually break-test, not assume |
| Confirm Contact cannot reach the internal backend URL at all | 5m | — |

**Owner note:** this is a QA pass, not new code — pair it with whoever
builds Component 3's security groups so they verify what they just wrote.

---

## 2. Native Odoo Apps (config, not code)

**What it is:** installing and configuring apps Odoo already ships —
Contacts, Sales, Purchase, Accounting. No Python here.

```
docker compose up
  → create DB → install apps → pick CoA template
  → verify default accounts/journals → seed demo master data
  → smoke-test PO→Bill→Payment and SO→Invoice→Payment once
```

| Task | Est. | Depends on |
|---|---|---|
| `docker compose up -d`, create DB, install Accounting + Sales + Purchase + Contacts | 15m | — |
| Pick/confirm Chart of Accounts template; verify Cash, Bank, Debtors, Creditors, Sale Income, Purchase Expense accounts exist (rename if the template's labels differ) | 30m | above |
| Verify default Journals (Sales/Purchase/Bank/Cash) point at the right default accounts | 15m | above |
| Seed demo master data matching the PDF's own examples: Vendor "Rahul Sharma", Customer "Nimesh Pathak", Products (Office Chair, Wooden Table, Sofa, Dining Table) | 30m | above |
| Walk one full PO→Bill→Payment and one SO→Invoice→Payment by hand, confirm journal entries post correctly | 30m | seed data |

**Total: ~2h.** This is the fastest component — front-load it so
everyone else has real data to build/test against.

---

## 3. Custom Addon (`urban_furniture_accounting`) — the actual code

**What it is:** the only component with real Python/XML. Four sub-parts:

```
urban_furniture_accounting/
├── models/
│   ├── res_partner.py      (a)
│   └── budget.py           (c)
├── security/
│   ├── groups.xml          (b)
│   └── ir.model.access.csv (b)
└── reports/
    ├── balance_sheet.py    (d)
    ├── profit_loss.py      (d)
    └── budget_report.py    (d)
```

### (a) Contact extension
| Task | Est. |
|---|---|
| Add `partner_type` (Customer/Vendor/Both) field + inherited form view | 30m |
| On save, set `customer_rank`/`supplier_rank` so native Customer/Vendor filters keep working | 20m |

### (b) Security groups
| Task | Est. |
|---|---|
| `group_urban_admin`: implies `account.group_account_manager` + `sales_team.group_sale_manager` + `purchase.group_purchase_manager` + `base.group_partner_manager` | 30m |
| `group_urban_invoicing_user`: implies `account.group_account_invoice` + `sales_team.group_sale_salesman` + `purchase.group_purchase_user` | 30m |
| `ir.model.access.csv` rows for the Budget model per group | 15m | needs (c) |

### (c) Budget model — new, Community has no equivalent
| Task | Est. |
|---|---|
| Model: `name`, `period_start`, `period_end`, `analytic_account_id`, `planned_amount`, `responsible_user_id` | 30m |
| Computed `actual_amount`: sum `account.move.line` for that analytic account within the period | 40m |
| List/form view + menu item under Accounting | 20m |

### (d) Custom reports — the heaviest single piece
| Task | Est. |
|---|---|
| Shared query helper: pull `account.move.line` joined to `account.account`, grouped by account type, for a date range | 30m |
| Balance Sheet view (as-of-date snapshot, Asset/Liability/Capital) | 45m |
| P&L view (date range, Income/Expense, net profit) | 45m |
| Budget Report view (Budget records: planned vs. computed actual, variance) | 30m |

**Total: ~5-6h.** This is the critical path — assign your strongest
Odoo/Python person here, and have the other two feed it (working
transactions from Component 2, working groups from (b)) rather than
blocking on it.

---

## 4. Data Layer / Dev Environment

**What it is:** already mostly scaffolded (`docker-compose.yml`). Just
needs finishing touches and a safety net for the actual demo.

| Task | Est. | Depends on |
|---|---|---|
| Confirm `./addons` mount path and module auto-detection work end-to-end | 10m | — |
| Document default credentials / DB name in README | 10m | — |
| Take a DB dump/snapshot once the core flow works, as a rollback point before the demo | 15m | Components 2 & 3 done |

**Total: ~35m.** Cheap — do the first two early, the snapshot right
before you'd otherwise start touching things you don't need to.

---

## 5. AI Agent Layer (Phase 3 — do not start before 1-4 are demoable)

**What it is:** a thin layer that turns natural language into Odoo
actions, via XML-RPC — the direction we picked was natural-language
transaction entry (see project memory on the agent plan).

```
User types a sentence
  → LLM w/ tool-calling picks a tool (create_sales_order, create_purchase_order, get_invoice_status)
  → tool calls Odoo's XML-RPC (execute_kw) with real args
  → Odoo creates/reads the record via the SAME native flow as Component 2
  → result summarized back to the user
```

| Task | Est. | Depends on |
|---|---|---|
| Wrap Odoo XML-RPC in a small Python client (`execute_kw` against `res.partner`, `sale.order`, `purchase.order`) | 45m | Components 2 & 3 working |
| Define 2-3 tools: `create_sales_order`, `create_purchase_order`, `get_invoice_status` | 45m | above |
| Wire a minimal chat interface (CLI is fine) to test tool-calling against a real LLM | 30-45m | above |
| Write 3-4 canned demo phrases that reliably resolve correctly (de-risk the live demo instead of trusting fully open-ended input) | 20m | above |

**Total: ~2-2.5h.** Only start this once someone can demo Components 1-4
end-to-end without you standing next to them explaining it.

---

## Suggested ownership (maps to the 3-person split + `git_workflow_convention`)

| Person | Primary component(s) | Why |
|---|---|---|
| Person A | 1 (access QA) + 2 (native app config, seed data) | Fastest path to a demoable base others build on |
| Person B | 3(a) + 3(b) (Contact ext + security groups) | Smaller, well-scoped, unblocks Component 1's QA early |
| Person C | 3(c) + 3(d) (Budget + reports) | Heaviest, most code-dense — give it the most runway |
| Whoever finishes first | 4 (env polish) then help on 3(d) | 4 is cheap; 3(d) is the bottleneck |
| All 3, after 1-4 work | 5 (AI agent) | Only after the graded core is demoable |
