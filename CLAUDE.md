# Urban Furniture — Accounting System (Odoo)

24-hour Odoo hackathon build, 3-person team. Full design reasoning lives in
`docs/ARCHITECTURE.md`, and the per-component breakdown with concrete
tasks/estimates/ownership lives in `docs/COMPONENT_TASKS.md` — read both
before making structural decisions. This file is the quick-reference for
how to work in this repo.

## Stack

- Odoo 17 Community + PostgreSQL 15, local via `docker compose up -d`
  (Odoo at `localhost:8069`)
- Custom addon: `addons/urban_furniture_accounting/`

## Core principle: reuse first, build only real gaps

Odoo's `account`, `sale`, `purchase`, and `contacts` modules already
correctly implement double-entry posting, tax computation, and the
Purchase Order → Vendor Bill → Payment / Sales Order → Invoice → Payment
flows. **Do not reimplement any of that.** Depend on those apps in the
manifest and use their models/screens as-is.

Write custom code only for the actual gaps:

- `res.partner` extension: `partner_type` (Customer/Vendor/Both)
- Security: `group_urban_admin`, `group_urban_invoicing_user` (composed
  from Odoo's existing native groups), plus verifying the Contact/portal
  persona is correctly scoped to their own invoices/bills
- `Budget` model — Odoo Community has no Budget app, this is genuinely new
- Balance Sheet / P&L / Budget Report — Community lacks the Enterprise
  dynamic reporting engine, so these are custom queries/views over
  `account.move.line`

Before writing any custom logic, check whether Odoo already does it. If
you're not sure, that's a design question to raise, not something to
build around silently.

## Build order (do not skip ahead)

1. **Core pipeline** — master data, transaction flow, security, the 3
   reports. Target: 6-8 hours. This is what the spec is actually graded
   on — get it fully demoable before touching anything else.
2. **UI polish** — inherited view tweaks on existing screens, restyle the
   Contact's portal page. Only after step 1 is verified working end-to-end.
3. **AI agent layer** — natural-language transaction entry on top of the
   working pipeline. Only after steps 1 and 2 are demoable. Scope for this
   is not finalized yet — see `docs/ARCHITECTURE.md` open questions.

## Git workflow (once real implementation starts — not for planning docs)

- One branch per person per **task** (branch name = the task, e.g.
  `budget-report`, `contact-portal-scoping`), cut from the latest `main`.
- Commit message format is Conventional Commits: `type(scope): subject`,
  blank line, then a 3-5 line body on what changed and *why* (a spec
  decision, a tradeoff, anything not obvious from the diff). Types:
  `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Merge with `git merge --no-ff`; the merge commit message names the
  feature, not "Merge branch X into main".
- Each person commits under their own already-configured git identity.
  No AI co-author trailers, no mention of AI tooling anywhere in commit
  messages or PRs.
- Commit per completed, working task — not per file save, not batched at
  the end of a session.

## Team

- `redwing-381`
- `merlynnatty`
- `shobanravichandran`
