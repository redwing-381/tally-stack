from odoo import api, fields, models

ASSET_TYPES = (
    "asset_receivable", "asset_cash", "asset_current",
    "asset_non_current", "asset_fixed", "asset_prepayments",
)
LIABILITY_TYPES = (
    "liability_payable", "liability_credit_card",
    "liability_current", "liability_non_current",
)
EQUITY_TYPES = ("equity", "equity_unaffected")
INCOME_TYPES = ("income", "income_other")
EXPENSE_TYPES = ("expense", "expense_depreciation", "expense_direct_cost")

SECTION_BY_TYPE = {}
for t in ASSET_TYPES:
    SECTION_BY_TYPE[t] = "asset"
for t in LIABILITY_TYPES:
    SECTION_BY_TYPE[t] = "liability"
for t in EQUITY_TYPES:
    SECTION_BY_TYPE[t] = "equity"
for t in INCOME_TYPES:
    SECTION_BY_TYPE[t] = "income"
for t in EXPENSE_TYPES:
    SECTION_BY_TYPE[t] = "expense"

SECTION_LABELS = {
    "asset": "Assets",
    "liability": "Liabilities",
    "equity": "Capital",
    "income": "Income",
    "expense": "Expenses",
}


class UfaFinancialReportWizard(models.TransientModel):
    _name = "ufa.financial.report.wizard"
    _description = "Balance Sheet / P&L report"

    report_type = fields.Selection(
        selection=[("balance_sheet", "Balance Sheet"), ("profit_loss", "Profit & Loss")],
        required=True,
        default="balance_sheet",
    )
    date_from = fields.Date(
        help="Only used for Profit & Loss - Balance Sheet is a cumulative "
        "snapshot as of Date To."
    )
    date_to = fields.Date(required=True, default=fields.Date.context_today)
    line_ids = fields.One2many("ufa.financial.report.line", "wizard_id", readonly=True)
    net_result = fields.Monetary(readonly=True)
    currency_id = fields.Many2one(
        "res.currency", default=lambda self: self.env.company.currency_id
    )

    def action_generate(self):
        self.ensure_one()
        self.line_ids.unlink()

        if self.report_type == "profit_loss":
            section_types = INCOME_TYPES + EXPENSE_TYPES
        else:
            section_types = ASSET_TYPES + LIABILITY_TYPES + EQUITY_TYPES

        domain = [
            ("parent_state", "=", "posted"),
            ("date", "<=", self.date_to),
            ("account_id.account_type", "in", list(section_types)),
        ]
        if self.report_type == "profit_loss" and self.date_from:
            domain.append(("date", ">=", self.date_from))

        groups = self.env["account.move.line"].read_group(
            domain, ["balance:sum"], ["account_id"]
        )

        lines = []
        net_result = 0.0
        for group in groups:
            account = self.env["account.account"].browse(group["account_id"][0])
            section = SECTION_BY_TYPE.get(account.account_type)
            if not section:
                continue
            balance = group["balance"]
            # Income/liability/equity are credit-normal in Odoo's ledger
            # (negative balance = credit); flip sign so the report reads
            # as a plain positive amount for those sections.
            if section in ("liability", "equity", "income"):
                balance = -balance
            lines.append((0, 0, {
                "section": section,
                "account_id": account.id,
                "balance": balance,
            }))
            if self.report_type == "profit_loss":
                net_result += balance if section == "income" else -balance

        self.line_ids = lines
        self.net_result = net_result

        return {
            "type": "ir.actions.act_window",
            "res_model": self._name,
            "res_id": self.id,
            "view_mode": "form",
            "target": "new",
        }


class UfaFinancialReportLine(models.TransientModel):
    _name = "ufa.financial.report.line"
    _description = "Balance Sheet / P&L report line"
    _order = "section, account_id"

    wizard_id = fields.Many2one("ufa.financial.report.wizard", required=True, ondelete="cascade")
    section = fields.Selection(
        selection=[(k, v) for k, v in SECTION_LABELS.items()],
    )
    account_id = fields.Many2one("account.account", required=True)
    balance = fields.Monetary()
    currency_id = fields.Many2one(related="wizard_id.currency_id")
