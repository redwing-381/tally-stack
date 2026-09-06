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
    "depends": ["base", "account", "contacts", "sale", "purchase", "auth_signup"],
    "data": [
        "security/urban_furniture_groups.xml",
        "security/ir.model.access.csv",
        "views/res_partner_views.xml",
        "views/budget_views.xml",
        "views/financial_report_views.xml",
        "data/demo_master_data.xml",
    ],
    "installable": True,
    "application": True,
    "post_init_hook": "post_init_hook",
}
