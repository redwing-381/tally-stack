from odoo import api, fields, models


class UfaBudget(models.Model):
    _name = "ufa.budget"
    _description = "Urban Furniture Budget"
    _order = "period_start desc"

    name = fields.Char(required=True)
    period_start = fields.Date(required=True)
    period_end = fields.Date(required=True)
    analytic_account_id = fields.Many2one(
        "account.analytic.account", string="Analytic Account", required=True
    )
    planned_amount = fields.Monetary(required=True)
    responsible_user_id = fields.Many2one(
        "res.users", string="Responsible Person", default=lambda self: self.env.user
    )
    currency_id = fields.Many2one(
        "res.currency", default=lambda self: self.env.company.currency_id
    )
    company_id = fields.Many2one(
        "res.company", default=lambda self: self.env.company
    )

    actual_amount = fields.Monetary(
        compute="_compute_actual_amount",
        help="Sum of account.analytic.line amounts posted against this "
        "budget's analytic account within its period.",
    )
    variance = fields.Monetary(
        compute="_compute_actual_amount",
        help="planned_amount - actual_amount. Positive means under budget.",
    )

    @api.depends("analytic_account_id", "period_start", "period_end")
    def _compute_actual_amount(self):
        AnalyticLine = self.env["account.analytic.line"]
        for budget in self:
            actual = 0.0
            if budget.analytic_account_id and budget.period_start and budget.period_end:
                lines = AnalyticLine.search([
                    ("account_id", "=", budget.analytic_account_id.id),
                    ("date", ">=", budget.period_start),
                    ("date", "<=", budget.period_end),
                ])
                actual = sum(lines.mapped("amount"))
            budget.actual_amount = actual
            budget.variance = budget.planned_amount - actual
