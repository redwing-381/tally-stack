from odoo import fields, models


class AccountAnalyticAccount(models.Model):
    _inherit = "account.analytic.account"

    ufa_type = fields.Selection(
        selection=[
            ("income", "Income"),
            ("expense", "Expenses"),
        ],
        string="Analytic Type",
        help="Whether this analytic account tracks Income or Expenses, per "
        "the Budget Flow spec. Odoo's own analytic accounts are untyped — "
        "they group entries via the analytic plan — so this is the one "
        "genuinely missing field rather than a rename of an existing one.",
    )
