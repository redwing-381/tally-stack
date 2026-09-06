from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


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

    # Enforced here rather than only in the dialog: the frontend is not the
    # only writer. Server Actions, the AI agent's execute route and anyone
    # on Odoo's own screens all reach this model directly, and the database
    # already accumulated a budget with a negative amount and an end date
    # before its start before these existed.
    @api.constrains("period_start", "period_end")
    def _check_period(self):
        for budget in self:
            if budget.period_start and budget.period_end and budget.period_end < budget.period_start:
                raise ValidationError(
                    _("The period end (%(end)s) cannot be before the period start (%(start)s).",
                      end=budget.period_end, start=budget.period_start)
                )

    @api.constrains("planned_amount")
    def _check_planned_amount(self):
        for budget in self:
            if budget.planned_amount <= 0:
                raise ValidationError(
                    _("The planned amount must be greater than zero — got %s.", budget.planned_amount)
                )

    @api.depends("analytic_account_id", "period_start", "period_end")
    def _compute_actual_amount(self):
        AnalyticLine = self.env["account.analytic.line"]
        for budget in self:
            actual = 0.0
            if budget.analytic_account_id and budget.period_start and budget.period_end:
                # account.analytic.line has no single "account_id" column in
                # Odoo's multi-plan analytic accounting — each plan stores its
                # account in its own dynamically-named column (auto_account_id,
                # x_plan2_id, etc). Searching the literal "account_id" field
                # silently matches nothing for any account outside the legacy
                # default plan, which is why actual_amount always read 0 here —
                # confirmed live by tracing a posted invoice's analytic line
                # straight through to this column name.
                column = budget.analytic_account_id.plan_id._column_name()
                lines = AnalyticLine.search([
                    (column, "=", budget.analytic_account_id.id),
                    ("date", ">=", budget.period_start),
                    ("date", "<=", budget.period_end),
                ])
                # Odoo's analytic convention signs expense postings negative
                # and income postings positive (amount = -move_line.balance).
                # A budget is a magnitude to track against a plan either way,
                # so normalize to a positive "amount of activity" here rather
                # than leaking that internal sign convention into a field
                # whose whole job is a plain planned-vs-actual comparison.
                actual = abs(sum(lines.mapped("amount")))
            budget.actual_amount = actual
            budget.variance = budget.planned_amount - actual
