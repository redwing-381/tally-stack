import logging
import re

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$")


class UrbanFurnitureAuthController(http.Controller):
    @http.route(
        "/urban_furniture/password_reset",
        type="json",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def password_reset(self, login=None, **kwargs):
        """Triggers Odoo's own reset-password email (auth_signup) for the
        given login/email. Always returns the same generic result so this
        endpoint can't be used to discover which logins exist.
        """
        if login:
            try:
                request.env["res.users"].sudo().reset_password(login.strip())
            except Exception:
                _logger.info("Password reset requested for unknown login %r", login)
        return {"ok": True}

    @http.route(
        "/urban_furniture/group_ids",
        type="json",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def group_ids(self, **kwargs):
        """Resolves the Admin / Invoicing User group's numeric ids for the
        frontend's login persona check. Deliberately sudo()'d and public:
        these ids aren't sensitive, and the whole point is to give this to
        a user *before* we know they have any particular access — reading
        ir.model.data directly under the logging-in user's own session
        fails for anyone who isn't an Admin (verified live), which used to
        silently break login for exactly the accounts this app's own
        signup form creates.
        """
        env = request.env(su=True)
        return {
            "admin": env.ref("urban_furniture_accounting.group_urban_admin").id,
            "invoicing": env.ref("urban_furniture_accounting.group_urban_invoicing_user").id,
        }

    @http.route(
        "/urban_furniture/reset_password_info",
        type="json",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def reset_password_info(self, token=None, **kwargs):
        """Looks up who a reset token belongs to, so our own
        /reset-password page can greet them and validate the token before
        showing the new-password form."""
        if not token:
            return {"ok": False, "error": "Missing reset token."}
        try:
            info = request.env["res.partner"].sudo().signup_retrieve_info(token)
        except Exception:
            return {"ok": False, "error": "This reset link is invalid or has expired."}
        return {"ok": True, "name": info.get("name"), "login": info.get("login")}

    @http.route(
        "/urban_furniture/reset_password_confirm",
        type="json",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def reset_password_confirm(self, token=None, password=None, **kwargs):
        """Sets the new password for a valid reset token — the same
        underlying res.users.signup() Odoo's own /web/reset_password page
        calls, just reached from our own UI instead of Odoo's."""
        if not token or not password:
            return {"ok": False, "error": "Missing token or password."}
        if not PASSWORD_RE.match(password):
            return {
                "ok": False,
                "error": (
                    "Password must be more than 8 characters and include a lowercase "
                    "letter, an uppercase letter, and a special character."
                ),
            }
        try:
            request.env["res.users"].sudo().signup({"password": password}, token)
            request.env.cr.commit()
        except Exception:
            _logger.exception("Password reset confirm failed for token")
            return {"ok": False, "error": "This reset link is invalid or has expired."}
        return {"ok": True}

    @http.route(
        "/urban_furniture/signup",
        type="json",
        auth="public",
        methods=["POST"],
        csrf=False,
    )
    def signup(self, login=None, email=None, password=None, **kwargs):
        """Public self-signup for the Contact/Customer portal role only —
        there is no role picker here, and this never grants Admin or
        Invoicing User. It also can't hand out portal access to just any
        email: a Contact/Customer only has invoices to see because an
        Admin or Invoicing user already recorded a sale against them as a
        real contact, so signup requires the email to match one of those
        existing contacts and grants portal access to that same partner —
        it never creates a new, disconnected contact record.
        """
        env = request.env(su=True)
        login = (login or "").strip()
        email = (email or "").strip()

        if not (6 <= len(login) <= 12):
            return {"ok": False, "error": "Login id must be between 6 and 12 characters."}
        if env["res.users"].search_count([("login", "=", login)]):
            return {"ok": False, "error": "That login id is already taken."}
        if not email or "@" not in email:
            return {"ok": False, "error": "Enter a valid email address."}
        if not password or not PASSWORD_RE.match(password):
            return {
                "ok": False,
                "error": (
                    "Password must be more than 8 characters and include a lowercase "
                    "letter, an uppercase letter, and a special character."
                ),
            }

        partner = env["res.partner"].search(
            [("email", "=", email), ("partner_type", "in", ["customer", "both"])], limit=1
        )
        if not partner:
            return {
                "ok": False,
                "error": (
                    "No customer contact found with that email. Ask an Admin or "
                    "Invoicing user to add you as a contact first."
                ),
            }
        if partner.user_ids:
            return {
                "ok": False,
                "error": "An account already exists for this contact — try signing in instead.",
            }

        try:
            env["res.users"].create(
                {
                    "login": login,
                    "email": email,
                    "password": password,
                    "partner_id": partner.id,
                    "groups_id": [(6, 0, [env.ref("base.group_portal").id])],
                }
            )
        except Exception:
            _logger.exception("Signup failed for login %r", login)
            return {"ok": False, "error": "Couldn't create the account. Try a different login."}

        return {"ok": True}

    def _require_admin(self):
        """res.users create/write is Settings-only in stock Odoo
        (ir.model.access restricts it to group_erp_manager), which our
        custom Admin group deliberately does NOT imply — it's scoped to
        accounting/sales/purchase administration, not full Settings access.
        So creating a user here always needs an explicit sudo(), gated by
        checking the *caller* is one of our own Admins first — verified
        live that an authenticated Urban Furniture Admin still gets a
        plain AccessError calling res.users.create() directly without this.
        """
        if not request.env.user.has_group("urban_furniture_accounting.group_urban_admin"):
            return {"ok": False, "error": "Only an Admin can do that."}
        return None

    @http.route(
        "/urban_furniture/admin/create_invoicing_user",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def admin_create_invoicing_user(self, name=None, login=None, email=None, password=None, **kwargs):
        """Admin-initiated: creates a real Invoicing User account, active
        and able to sign in immediately with the password given here — no
        separate reset-password step, same as a fresh Customer signup."""
        denied = self._require_admin()
        if denied:
            return denied

        env = request.env(su=True)
        name = (name or "").strip()
        login = (login or "").strip()
        email = (email or "").strip()

        if not name:
            return {"ok": False, "error": "Name is required."}
        if not (6 <= len(login) <= 12):
            return {"ok": False, "error": "Login id must be between 6 and 12 characters."}
        if env["res.users"].search_count([("login", "=", login)]):
            return {"ok": False, "error": "That login id is already taken."}
        if not email or "@" not in email:
            return {"ok": False, "error": "Enter a valid email address."}
        if not password or not PASSWORD_RE.match(password):
            return {
                "ok": False,
                "error": (
                    "Password must be more than 8 characters and include a lowercase "
                    "letter, an uppercase letter, and a special character."
                ),
            }

        invoicing_group = env.ref("urban_furniture_accounting.group_urban_invoicing_user")
        try:
            env["res.users"].create(
                {
                    "name": name,
                    "login": login,
                    "email": email,
                    "password": password,
                    "groups_id": [(6, 0, [env.ref("base.group_user").id, invoicing_group.id])],
                }
            )
        except Exception:
            _logger.exception("Admin-create invoicing user failed for login %r", login)
            return {"ok": False, "error": "Couldn't create the account. Try a different login."}

        return {"ok": True}

    @http.route(
        "/urban_furniture/admin/create_customer_login",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def admin_create_customer_login(self, partner_id=None, login=None, password=None, **kwargs):
        """Admin-initiated portal access for a contact they pick directly —
        unlike public /signup there's no email-matching step, since the
        Admin is choosing a known contact from their own Contacts list."""
        denied = self._require_admin()
        if denied:
            return denied

        env = request.env(su=True)
        login = (login or "").strip()

        partner = env["res.partner"].browse(int(partner_id)) if partner_id else env["res.partner"]
        if not partner.exists():
            return {"ok": False, "error": "Contact not found."}
        if partner.user_ids:
            return {"ok": False, "error": "This contact already has a login."}
        if not (6 <= len(login) <= 12):
            return {"ok": False, "error": "Login id must be between 6 and 12 characters."}
        if env["res.users"].search_count([("login", "=", login)]):
            return {"ok": False, "error": "That login id is already taken."}
        if not password or not PASSWORD_RE.match(password):
            return {
                "ok": False,
                "error": (
                    "Password must be more than 8 characters and include a lowercase "
                    "letter, an uppercase letter, and a special character."
                ),
            }

        try:
            env["res.users"].create(
                {
                    "login": login,
                    "password": password,
                    "partner_id": partner.id,
                    "groups_id": [(6, 0, [env.ref("base.group_portal").id])],
                }
            )
        except Exception:
            _logger.exception("Admin-create customer login failed for login %r", login)
            return {"ok": False, "error": "Couldn't create the login. Try a different login id."}

        return {"ok": True}
