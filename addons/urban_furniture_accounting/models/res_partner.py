import urllib.parse

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

    def _get_signup_url_for_action(self, url=None, action=None, view_type=None, menu_id=None, res_id=None, model=None):
        """Reset-password emails should send people to our own branded
        /reset-password page instead of Odoo's native web client — the rest
        of this app never shows a raw Odoo screen, so this shouldn't either.
        Only rewrites the reset_password route; other signup_url uses
        (e.g. Odoo's own "Invite user" flow) are left alone.
        """
        res = super()._get_signup_url_for_action(
            url=url, action=action, view_type=view_type, menu_id=menu_id, res_id=res_id, model=model
        )
        frontend_url = self.env["ir.config_parameter"].sudo().get_param("urban_furniture.frontend_url")
        if not frontend_url:
            return res
        for partner_id, signup_url in res.items():
            if not signup_url or "/web/reset_password" not in signup_url:
                continue
            query = urllib.parse.parse_qs(urllib.parse.urlparse(signup_url).query)
            token = query.get("token", [None])[0]
            if token:
                res[partner_id] = f"{frontend_url.rstrip('/')}/reset-password?token={urllib.parse.quote(token)}"
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
