from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    partner_type = fields.Selection(
        selection=[
            ("customer", "Customer"),
            ("vendor", "Vendor"),
            ("both", "Both"),
        ],
        string="Contact Type",
        help="Whether this contact is a Customer, Vendor, or Both, per the "
        "Contact Master spec.",
    )

    @api.model_create_multi
    def create(self, vals_list):
        partners = super().create(vals_list)
        for partner in partners:
            partner._sync_rank_from_partner_type()
        return partners

    def write(self, vals):
        res = super().write(vals)
        if "partner_type" in vals:
            for partner in self:
                partner._sync_rank_from_partner_type()
        return res

    def _sync_rank_from_partner_type(self):
        """Keep native customer_rank/supplier_rank in sync with our
        explicit partner_type field, so stock Odoo filters (Customers,
        Vendors) keep working without duplicating that logic."""
        for partner in self:
            values = {}
            if partner.partner_type in ("customer", "both") and not partner.customer_rank:
                values["customer_rank"] = 1
            if partner.partner_type in ("vendor", "both") and not partner.supplier_rank:
                values["supplier_rank"] = 1
            if values:
                super(ResPartner, partner).write(values)
