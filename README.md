# Tally Stack — Urban Furniture Accounting

An accounting system for Urban Furniture: master data, both transaction
flows, budgets and financial statements, behind a purpose-built product UI
with an AI assistant that records transactions from plain English.

Odoo 17 Community is the accounting engine — it already does double-entry
posting, tax and the order → invoice → payment flows correctly, so none of
that was reimplemented. A Next.js app sits in front of it and is the only
interface anyone uses; no Odoo screen is ever exposed.

## Stack

| Service | Role | URL |
|---|---|---|
| `frontend` | Next.js 16 — the entire product UI | http://localhost:3000 |
| `odoo` | Odoo 17 Community + custom addon | http://localhost:8069 |
| `db` | PostgreSQL 15 | — |
| `mailpit` | Catches outgoing SMTP so signup / reset mail can be read | http://localhost:8025 |

External: **Razorpay** (portal checkout) and **OpenRouter** (the assistant's model).

## Quick start

```bash
cp .env.example .env      # add your OpenRouter key
docker compose up -d
```

Open **http://localhost:3000**. The database is `urban_furniture`; if you're
starting from an empty volume, create it at `localhost:8069` and install the
**Urban Furniture Accounting** app, which pulls in `account`, `sale`,
`purchase`, `contacts` and `auth_signup`.

## The three roles

| Role | Sees |
|---|---|
| **Admin** | Everything, plus creating the other two logins (Team → Users) |
| **Invoicing User** | Master data, both transaction flows, budgets and reports |
| **Contact** | The portal only — their own invoices, and paying them |

Roles are `group_urban_admin` and `group_urban_invoicing_user`, composed
from Odoo's native groups; the Contact persona is Odoo's own portal user.
`proxy.ts` gates routes on a cookie for navigation, but authorisation is
Odoo's own ACLs and record rules on every call — a forged cookie changes
what renders, never what can be read or written.

## What's in it

- **Master data** — contacts (typed customer / vendor / both), products,
  chart of accounts, journals, analytic accounts
- **Sales** — order → invoice → payment, with order state and billing state
  shown as separate badges so "Sale" is never mistaken for "paid"
- **Purchases** — order → vendor bill → payment, plus an outstanding-payables
  view you can settle from
- **Budgets** — planned vs. actual vs. variance, where actual is computed
  from posted analytic lines rather than typed in. Odoo Community ships no
  Budget app; this is genuinely new.
- **Reports** — Balance Sheet, Profit & Loss and Budget report, each
  downloadable as a PDF
- **Customer portal** — a Contact sees only their own invoices and pays via
  Razorpay
- **AI assistant** — natural-language transaction entry over the same Server
  Actions the manual UI uses. Every write is a *proposal*: the model never
  touches the database, and nothing is written until a human presses
  Confirm. It also scans draft orders for pricing anomalies and offers the
  correction.

## Repo layout

```
addons/urban_furniture_accounting/   custom Odoo module (models, security, controllers, report wizard)
frontend/                            Next.js app — the product UI
  app/                               routes; (app)/ is the signed-in shell, / is the landing page
  components/                        UI, one folder per domain
  lib/odoo/                          JSON-RPC client, queries, Server Actions
  lib/agent/                         assistant tools and name→id lookups
docs/                                architecture, demo script, task board, problem statement
backups/                             DB snapshots (gitignored)
```

## Design system

One palette and type scale, defined once in `frontend/app/globals.css` — a
ledger theme keyed to the logo: forest-green ink, brass accent, sage paper,
with the dark sidebar surface reused for the landing page. Fraunces for
headings, IBM Plex Sans for body, IBM Plex Mono for figures. Components
take colours from those tokens rather than literals.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why the reuse-first split
- [docs/demo-architecture.excalidraw](docs/demo-architecture.excalidraw) — one-frame overview
- [docs/final-architecture.excalidraw](docs/final-architecture.excalidraw) — the detailed version
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 4:05 demo video script
- [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) — manual test passes
- [CLAUDE.md](CLAUDE.md) — build order and git workflow

## Snapshots

Take a rollback point before demoing or bulk-loading data:

```bash
docker compose exec -T db pg_dump -U odoo -d urban_furniture -Fc \
  > backups/urban_furniture_$(date +%Y%m%d-%H%M).dump

# restore
docker compose exec -T db pg_restore -U odoo -d urban_furniture --clean \
  < backups/<file>.dump
```
