import { NextResponse } from "next/server";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

/**
 * Triggers Odoo's own reset-password email (auth_signup) via a public
 * controller in our addon — reuses Odoo's real token + mail flow instead of
 * building a parallel one. Always responds ok, regardless of whether the
 * login exists, so this can't be used to enumerate accounts.
 */
export async function POST(req: Request) {
  const { login } = (await req.json()) as { login?: string };

  if (login?.trim()) {
    await fetch(`${ODOO_URL}/urban_furniture/password_reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { login: login.trim() } }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
