import { callKwWithSession } from "./client";
import type { Persona } from "./types";

export const SESSION_COOKIE = "ufa_session";
export const PERSONA_COOKIE = "ufa_persona";
export const NAME_COOKIE = "ufa_name";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

let groupIdCache: { admin: number; invoicing: number } | null = null;

/**
 * Resolves the two custom security groups' numeric res_ids once and caches
 * them for the life of the server process — they never change for a given
 * database. Goes through the addon's own sudo()'d public endpoint rather
 * than reading ir.model.data under the logging-in user's own session: that
 * model is Admin/Settings-only, so an Invoicing User (exactly the kind of
 * account this app's own signup form creates) logging in first against a
 * cold cache would otherwise fail outright with an AccessError — verified
 * live after a server restart.
 */
async function resolveGroupIds() {
  if (groupIdCache) return groupIdCache;

  const res = await fetch(`${ODOO_URL}/urban_furniture/group_ids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
    cache: "no-store",
  });
  const { result } = (await res.json()) as { result?: { admin: number; invoicing: number } };
  if (!result?.admin || !result?.invoicing) {
    throw new Error("Could not resolve Urban Furniture security groups");
  }

  groupIdCache = result;
  return groupIdCache;
}

/**
 * Classifies the logged-in user into a persona using data already on
 * res.users — no new backend fields. `share` is Odoo's own signal for
 * portal/public users; group membership distinguishes Admin from
 * Invoicing User for internal users.
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

  const { admin, invoicing } = await resolveGroupIds();
  if (user.groups_id.includes(admin)) {
    return { persona: "admin", name: user.name };
  }
  if (user.groups_id.includes(invoicing)) {
    return { persona: "invoicing", name: user.name };
  }
  return { persona: "unknown", name: user.name };
}
