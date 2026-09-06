import { NextResponse } from "next/server";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

/**
 * Public self-signup, proxied straight to the addon's controller. Deliberately
 * has no role parameter — every account created here lands in the limited
 * Invoicing User group; Admin is only ever granted by an existing Admin from
 * Odoo's own Users settings.
 */
export async function POST(req: Request) {
  const body = await req.json();

  const res = await fetch(`${ODOO_URL}/urban_furniture/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: body }),
    cache: "no-store",
  });
  const json = await res.json();

  if (json.error) {
    return NextResponse.json({ ok: false, error: "Couldn't reach the server." }, { status: 502 });
  }
  return NextResponse.json(json.result);
}
