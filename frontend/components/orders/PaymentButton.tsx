"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerPayment } from "@/lib/odoo/actions";

interface PaymentJournal {
  id: number;
  name: string;
  type: "bank" | "cash";
}

/**
 * Records a payment against an invoice or bill, through a chosen Bank or
 * Cash journal — the spec's "register payment (Cash/Bank)". Journals are
 * fetched on open through the read-only call_kw proxy rather than threaded
 * as props, so every caller stays a one-liner.
 */
export function PaymentButton({ moveId, redirectPath }: { moveId: number; redirectPath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [journals, setJournals] = useState<PaymentJournal[]>([]);
  const [journalId, setJournalId] = useState("");

  useEffect(() => {
    if (!open || journals.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/odoo/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "account.journal",
            method: "search_read",
            args: [[["type", "in", ["bank", "cash"]]], ["name", "type"]],
            kwargs: { order: "type" },
          }),
        });
        const data = await res.json();
        if (cancelled || !data.ok) return;
        setJournals(data.result);
        if (data.result.length) setJournalId(String(data.result[0].id));
      } catch {
        // Leaving the list empty falls back to Odoo's own default journal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, journals.length]);

  function onPay() {
    startTransition(async () => {
      try {
        await registerPayment(moveId, redirectPath, journalId ? Number(journalId) : undefined);
        toast.success("Payment registered.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't register the payment.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Register payment
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>Pay through</Label>
          <Select
            items={journals.map((j) => ({ value: String(j.id), label: j.name }))}
            value={journalId}
            onValueChange={(v) => v && setJournalId(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Loading…" />
            </SelectTrigger>
            <SelectContent>
              {journals.map((j) => (
                <SelectItem key={j.id} value={String(j.id)}>
                  {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The journal the money moves through. This posts the matching entry and settles the
            balance.
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={onPay}
            disabled={pending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Registering…" : "Register payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
