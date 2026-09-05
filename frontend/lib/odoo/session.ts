import { callKwWithSession } from "./client";
import type { Persona } from "./types";

export const SESSION_COOKIE = "ufa_session";
export const PERSONA_COOKIE = "ufa_persona";
export const NAME_COOKIE = "ufa_name";

const GROUP_XMLIDS = ["group_urban_admin", "group_urban_invoicing_user"] as const;

let groupIdCache: { admin: number; invoicing: number } | null = null;

/**
 * Resolves the two custom security groups' numeric res_ids once and caches
 * them for the life of the server process — they never change for a given
 * database. Avoids re-querying ir.model.data on every login.
 */
async function resolveGroupIds(sessionId: string) {
  if (groupIdCache) return groupIdCache;

  const rows = await callKwWithSession<Array<{ name: string; res_id: number }>>(
    sessionId,
    "ir.model.data",
    "search_read",
    [
      [
        ["module", "=", "urban_furniture_accounting"],
        ["name", "in", GROUP_XMLIDS],
      ],
      ["name", "res_id"],
    ],
  );

  const admin = rows.find((r) => r.name === "group_urban_admin")?.res_id;
  const invoicing = rows.find((r) => r.name === "group_urban_invoicing_user")?.res_id;
  if (!admin || !invoicing) {
    throw new Error("Could not resolve Urban Furniture security groups");
  }

  groupIdCache = { admin, invoicing };
  return groupIdCache;
}

/**
 * Classifies the logged-in user into a persona using data already on
 * res.users — no new backend fields. `share` is Odoo's own signal for
 * portal/public users; group membership distinguishes Admin from
 * Invoicing User for internal users.
 *
 * `share` is checked before ever touching ir.model.data: that model is
 * Admin/Settings-only, so a portal session can't read it (verified live —
 * it raises AccessError). Resolving group ids up front in parallel used to
 * mask this, since the module-level cache only needed one successful
 * internal-user login per server process to warm up — but a portal user
 * logging in first against a cold cache (e.g. right after a restart) would
 * fail outright. Sequencing on `share` first means a portal session never
 * makes that call at all.
 */
export async function classifyPersona(
  sessionId: string,
  uid: number,
): Promise<{ persona: Persona; name: string }> {
  const [user] = await callKwWithSession<
    Array<{ share: boolean; groups_id: number[]; name: string }>
  >(sessionId, "res.users", "read", [[uid], ["share", "groups_id", "name"]]);

  if (user.share) {
    return { persona: "portal", name: user.name };
  }

  const { admin, invoicing } = await resolveGroupIds(sessionId);
  if (user.groups_id.includes(admin)) {
    return { persona: "admin", name: user.name };
  }
  if (user.groups_id.includes(invoicing)) {
    return { persona: "invoicing", name: user.name };
  }
  return { persona: "unknown", name: user.name };
}
