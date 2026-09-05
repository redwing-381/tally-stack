"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpayCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window."));
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay's own hosted checkout — the same modal Odoo's native
 * portal page opens, via the same transaction Odoo's own controller
 * creates (see app/api/payments/[id]/razorpay). We never see card or UPI
 * details; Razorpay's iframe handles all of that. The invoice's
 * payment_state flips to Paid via Odoo's webhook, same as always — this
 * button only changes where "Pay" gets clicked, not how payment works.
 */
export function PayNowButton({ invoiceId }: { invoiceId: number }) {
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    try {
      const res = await fetch(`/api/payments/${invoiceId}/razorpay`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Could not start the payment.");

      await loadRazorpayCheckout();

      const razorpay = new window.Razorpay({
        ...data,
        key: data.razorpay_public_token || data.razorpay_key_id,
        customer_id: data.razorpay_customer_id,
        order_id: data.razorpay_order_id,
        description: data.reference,
        recurring: data.is_tokenize_request ? "1" : "0",
        // Not authoritative — see PaymentStatusPoller. For synchronous
        // methods (card) this fires right away; for UPI it often doesn't
        // fire at all, since the payment completes on the customer's phone
        // after this modal is already gone. Either way, the poller already
        // running on this page is what actually flips the status.
        handler: () => {
          toast.message("Payment submitted — confirming…");
          setPending(false);
        },
        modal: {
          ondismiss: () => setPending(false),
        },
      });
      razorpay.on("payment.failed", (response) => {
        toast.error(response.error?.description ?? "Payment failed.");
        setPending(false);
      });
      razorpay.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
      setPending(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={pay}
      disabled={pending}
      className="bg-accent text-accent-foreground hover:bg-accent/90"
    >
      {pending ? "Opening…" : "Pay now"}
    </Button>
  );
}
