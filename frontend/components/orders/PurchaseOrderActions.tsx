"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmPurchaseOrder, createPurchaseBill } from "@/lib/odoo/actions";

export function PurchaseOrderActions({ orderId, state, hasInvoice }: { orderId: number; state: string; hasInvoice: boolean }) {
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
              await confirmPurchaseOrder(orderId);
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

  if (state === "purchase" && !hasInvoice) {
    return (
      <Button
        disabled={pending}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={() =>
          startTransition(async () => {
            try {
              await createPurchaseBill(orderId);
              toast.success("Bill created and posted.");
              router.refresh();
            } catch {
              toast.error("Couldn't create the bill.");
            }
          })
        }
      >
        {pending ? "Creating…" : "Create bill"}
      </Button>
    );
  }

  return null;
}
