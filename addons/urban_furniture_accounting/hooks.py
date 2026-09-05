def post_init_hook(env):
    """Grant the installing admin our Admin group.

    Custom res.groups aren't implied by Odoo's own Settings/Administration
    group, so whoever installs this module wouldn't see the Urban
    Furniture menu at all until someone manually assigns them - found by
    live-testing as `admin`/`admin` on a fresh database.
    """
    admin_group = env.ref("urban_furniture_accounting.group_urban_admin")
    env.ref("base.user_admin").write({"groups_id": [(4, admin_group.id)]})
