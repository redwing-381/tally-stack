import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticate, OdooRpcError } from "@/lib/odoo/client";
import { classifyPersona, SESSION_COOKIE, PERSONA_COOKIE, NAME_COOKIE } from "@/lib/odoo/session";

const ODOO_DB = process.env.ODOO_DB ?? "urban_furniture";

export async function POST(request: Request) {
  const { login, password } = (await request.json()) as { login?: string; password?: string };

  if (!login || !password) {
    return NextResponse.json({ ok: false, error: "Enter a login and password." }, { status: 400 });
  }

  try {
    const { uid, sessionId } = await authenticate(ODOO_DB, login, password);
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Odoo did not return a session." }, { status: 502 });
    }

    const { persona, name } = await classifyPersona(sessionId, uid);

    // Portal users get the exact same cookie as everyone else: this is a
    // real Odoo session_id, and every RPC we make with it goes through
    // Odoo's own ir.rule record rules — a portal session can only ever
    // read/write its own partner's records, regardless of which page in
    // our app makes the call. We don't re-implement that scoping; Odoo
    // enforces it at the ORM level on every call_kw.
    const jar = await cookies();
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
    jar.set(SESSION_COOKIE, sessionId, cookieOpts);
    jar.set(PERSONA_COOKIE, persona, cookieOpts);
    jar.set(NAME_COOKIE, name, cookieOpts);

    return NextResponse.json({ ok: true, persona, name });
  } catch (err) {
    const message = err instanceof OdooRpcError ? err.message : "Login failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
