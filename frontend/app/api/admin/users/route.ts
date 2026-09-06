import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PERSONA_COOKIE, SESSION_COOKIE } from "@/lib/odoo/session";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

/**
 * Admin-only: creates an Invoicing User or a Customer (portal) login for an
 * existing contact. Both need a real Odoo session (res.users create/write is
 * Settings-only in stock Odoo — the addon controller sudo()'s past that,
 * but only after re-checking the caller is one of our own Admins), so this
 * forwards the admin's own session_id cookie rather than calling public.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  if (jar.get(PERSONA_COOKIE)?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Only an Admin can do that." }, { status: 403 });
  }
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { kind, ...params } = (await req.json()) as { kind: "invoicing" | "customer" } & Record<
    string,
    unknown
  >;
  const path =
    kind === "invoicing"
      ? "/urban_furniture/admin/create_invoicing_user"
      : "/urban_furniture/admin/create_customer_login";

  const res = await fetch(`${ODOO_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `session_id=${sessionId}` },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params }),
    cache: "no-store",
  });
  const json = await res.json();

  if (json.error) {
    return NextResponse.json({ ok: false, error: "Couldn't reach the server." }, { status: 502 });
  }
  return NextResponse.json(json.result);
}
