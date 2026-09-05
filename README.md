# Urban Furniture — Accounting System

An Odoo-based accounting system for Urban Furniture covering master data
(Contacts, Products, Chart of Accounts, Journals, Budgets), sales/purchase
transaction flows, and automated financial reporting (Balance Sheet, P&L,
Budget Report).

## Stack

- Odoo 17 (Community) as the application platform
- PostgreSQL 15
- Custom addon: `addons/urban_furniture_accounting`

## Local setup

```bash
docker compose up -d
```

Odoo will be available at `http://localhost:8069`. On first run, create a
database and install the **Urban Furniture Accounting** module from Apps.

## Repo layout

```
addons/urban_furniture_accounting/   # custom Odoo module
docker-compose.yml                   # local Odoo + Postgres
docs/                                # problem statement, architecture, task board
```

See [CLAUDE.md](CLAUDE.md) for the build order and git workflow, and
[docs/COMPONENT_TASKS.md](docs/COMPONENT_TASKS.md) for the task board.
