import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/odoo/client";
import { SESSION_COOKIE, PERSONA_COOKIE, NAME_COOKIE } from "@/lib/odoo/session";

export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await destroySession(sessionId);
  }

  jar.delete(SESSION_COOKIE);
  jar.delete(PERSONA_COOKIE);
  jar.delete(NAME_COOKIE);

  return NextResponse.json({ ok: true });
}
