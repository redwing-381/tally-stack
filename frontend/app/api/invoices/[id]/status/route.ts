import { NextResponse } from "next/server";
import { callKw, OdooRpcError } from "@/lib/odoo/client";

/**
 * Polled by the invoice page while a payment is pending. Razorpay's
 * checkout.js `handler` callback is unreliable for async methods like UPI —
 * the payment completes on the customer's phone, out of band, often after
 * the modal is already gone, so there's no client-side event to catch. The
 * webhook (already wired, see payment_razorpay's controller) is the only
 * reliable signal; this just gives the browser a way to notice it landed
 * without a manual refresh.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [invoice] = await callKw<Array<{ payment_state: string; amount_residual: number }>>(
      "account.move",
      "read",
      [[Number(id)], ["payment_state", "amount_residual"]],
    );
    return NextResponse.json({ ok: true, ...invoice });
  } catch (err) {
    const message = err instanceof OdooRpcError ? err.message : "Could not check payment status.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
