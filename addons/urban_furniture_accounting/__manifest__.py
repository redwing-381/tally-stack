{
    "name": "Urban Furniture Accounting",
    "version": "17.0.1.0.0",
    "summary": "Master data, transactions and reporting for Urban Furniture",
    "description": """
Accounting workflows for Urban Furniture: contacts, products, chart of
accounts, journals and budgets feeding sales/purchase transactions and
Balance Sheet, P&L and Budget reports.
""",
    "category": "Accounting/Accounting",
    "author": "Urban Furniture Team",
    "license": "LGPL-3",
    "depends": ["base", "account", "contacts", "sale", "purchase"],
    "data": [
        "views/res_partner_views.xml",
    ],
    "installable": True,
    "application": True,
}
