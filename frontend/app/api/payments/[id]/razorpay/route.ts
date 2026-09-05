import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callKw, searchRead, OdooRpcError } from "@/lib/odoo/client";
import { SESSION_COOKIE } from "@/lib/odoo/session";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

// payment.provider is an Admin/Settings-only model — a portal session can't
// read it (confirmed live: AccessError), so we can't look this id up over
// RPC the way we resolve our own security groups elsewhere. It's the id of
// the single Razorpay payment.provider record payment_razorpay ships (the
// one whose Key Id/Secret got filled in during setup). Override via env if
// a database reset ever gives it a different id.
const RAZORPAY_PROVIDER_ID = Number(process.env.RAZORPAY_PROVIDER_ID ?? "11");

/**
 * Creates a Razorpay payment.transaction for an invoice and returns its
 * processing values, exactly like Odoo's own portal payment form does —
 * this calls the same /invoice/transaction/<id> controller that page's JS
 * calls, using the current session's real session_id, so Odoo's own
 * document access check (the invoice's access_token) and record rules are
 * what decide whether this is allowed, not anything in this route. We only
 * reuse the response; the actual card/UPI entry happens entirely inside
 * Razorpay's own hosted checkout.js on the client, never on our server.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);

  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  try {
    const [invoice] = await callKw<Array<{ access_token: string; amount_residual: number }>>(
      "account.move",
      "read",
      [[invoiceId], ["access_token", "amount_residual"]],
    );
    const [upiMethod] = await searchRead<{ id: number }>(
      "payment.method",
      [["code", "=", "upi"]],
      ["id"],
      { limit: 1 },
    );

    const res = await fetch(`${ODOO_URL}/invoice/transaction/${invoiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          access_token: invoice.access_token,
          provider_id: RAZORPAY_PROVIDER_ID,
          payment_method_id: upiMethod?.id ?? false,
          token_id: false,
          amount: invoice.amount_residual,
          flow: "direct",
          tokenization_requested: false,
          // Razorpay's flow is 'direct' (a JS overlay, no server redirect),
          // so this shouldn't ever actually be navigated to — but if any
          // Odoo-side redirect path ever engages, this keeps it inside our
          // own app instead of bouncing out to Odoo's native portal.
          landing_route: `/portal/invoices/${invoiceId}`,
        },
      }),
      cache: "no-store",
    });

    const json = (await res.json()) as {
      result?: Record<string, unknown>;
      error?: { message: string; data?: { message?: string } };
    };
    if (json.error) {
      return NextResponse.json(
        { ok: false, error: json.error.data?.message ?? json.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, ...json.result });
  } catch (err) {
    const message = err instanceof OdooRpcError ? err.message : "Could not start the payment.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
