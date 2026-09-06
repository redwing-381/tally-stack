import { NextResponse } from "next/server";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

async function callOdoo(path: string, params: Record<string, unknown>) {
  const res = await fetch(`${ODOO_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params }),
    cache: "no-store",
  });
  return res.json();
}

/** GET ?token=... — looks up who the reset token belongs to. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });

  const json = await callOdoo("/urban_furniture/reset_password_info", { token });
  return NextResponse.json(json.result ?? { ok: false, error: "Couldn't reach the server." });
}

/** POST { token, password } — sets the new password. */
export async function POST(req: Request) {
  const { token, password } = (await req.json()) as { token?: string; password?: string };
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "Missing token or password." }, { status: 400 });
  }

  const json = await callOdoo("/urban_furniture/reset_password_confirm", { token, password });
  return NextResponse.json(json.result ?? { ok: false, error: "Couldn't reach the server." });
}
