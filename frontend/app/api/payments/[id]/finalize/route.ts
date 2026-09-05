import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/odoo/session";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

/**
 * Best-effort nudge: calls Odoo's own /payment/status/poll, the same route
 * its native /payment/status page polls to turn a `done` transaction into
 * an actual reconciled account.payment (payment._finalize_post_processing,
 * a private method — not callable via call_kw, which is why this goes
 * through the real controller instead).
 *
 * It only does anything if *this session* has a monitored transaction
 * (payment.transaction sets that when it's created, scoped to whichever
 * session created it) — so calling it from the paying customer's own tab
 * finalizes their payment immediately instead of waiting for Odoo's
 * 10-minute "post-process transactions" cron; calling it from any other
 * tab (e.g. an admin just watching the invoice) harmlessly no-ops. Errors
 * are swallowed everywhere — this is an accelerator, not the source of
 * truth. See PaymentStatusPoller, which calls this on every tick before
 * checking payment_state.
 */
export async function POST() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false });
  }

  try {
    await fetch(`${ODOO_URL}/payment/status/poll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
      cache: "no-store",
    });
  } catch {
    // Best effort — the poller's own status check is what actually matters.
  }

  return NextResponse.json({ ok: true });
}
