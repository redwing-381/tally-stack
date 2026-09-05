"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmSaleOrder, createSaleInvoice } from "@/lib/odoo/actions";

export function SaleOrderActions({ orderId, state, hasInvoice }: { orderId: number; state: string; hasInvoice: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (state === "draft" || state === "sent") {
    return (
      <Button
        disabled={pending}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={() =>
          startTransition(async () => {
            try {
              await confirmSaleOrder(orderId);
              toast.success("Order confirmed.");
              router.refresh();
            } catch {
              toast.error("Couldn't confirm the order.");
            }
          })
        }
      >
        {pending ? "Confirming…" : "Confirm order"}
      </Button>
    );
  }

  if (state === "sale" && !hasInvoice) {
    return (
      <Button
        disabled={pending}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={() =>
          startTransition(async () => {
            try {
              await createSaleInvoice(orderId);
              toast.success("Invoice created and posted.");
              router.refresh();
            } catch {
              toast.error("Couldn't create the invoice.");
            }
          })
        }
      >
        {pending ? "Creating…" : "Create invoice"}
      </Button>
    );
  }

  return null;
}
