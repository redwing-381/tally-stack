"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_MS = 3000;
const MAX_POLLS = 100; // ~5 minutes — a tab left open longer just needs a manual refresh.

/**
 * Mounted on any unpaid, posted invoice. Each tick: (1) nudges Odoo to
 * finalize a completed payment on this session, if there is one — see
 * app/api/payments/[id]/finalize for why that's needed at all: Odoo only
 * turns a `done` transaction into an actual reconciled payment when the
 * customer's browser visits its own /payment/status page, or otherwise
 * only via a 10-minute cron fallback, and we deliberately never send
 * anyone to that native page; (2) checks payment_state and, once paid,
 * reloads the page once and stops.
 *
 * Uses a hard reload rather than router.refresh(): this component has no
 * way to know whether Razorpay's checkout overlay is still covering the
 * page when the paid state lands, and a full reload guarantees the
 * server-rendered "Paid" state actually shows once that overlay is gone,
 * instead of depending on an RSC re-render having taken visible effect
 * underneath it.
 */
export function PaymentStatusPoller({ invoiceId }: { invoiceId: number }) {
  const notified = useRef(false);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(async () => {
      count += 1;
      if (count > MAX_POLLS) {
        clearInterval(interval);
        return;
      }
      try {
        await fetch(`/api/payments/${invoiceId}/finalize`, { method: "POST" }).catch(() => undefined);
        const res = await fetch(`/api/invoices/${invoiceId}/status`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok && data.payment_state === "paid" && !notified.current) {
          notified.current = true;
          clearInterval(interval);
          toast.success("Payment received.");
          setTimeout(() => window.location.reload(), 1200);
        }
      } catch {
        // Transient network hiccup — next tick tries again.
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [invoiceId]);

  return null;
}
