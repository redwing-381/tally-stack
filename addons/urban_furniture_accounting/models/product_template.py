from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    ufa_is_catalog = fields.Boolean(
        string="Urban Furniture Catalogue",
        default=False,
        help="Marks a product as part of Urban Furniture's own catalogue, so "
        "the sales/purchase order pickers offer it and Odoo's internal "
        "service products (down-payment 'Deposit', expense re-invoicing) "
        "stay out. Previously this was derived by looking the products up in "
        "ir.model.data, which only administrators may read — that made the "
        "order screens fail outright for the Invoicing User.",
    )
