"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAnalyticAccount } from "@/lib/odoo/actions";
import { ANALYTIC_TYPES } from "@/lib/accounting";
import type { AnalyticAccount } from "@/lib/odoo/types";

export function AnalyticAccountFormDialog({
  account,
  plans,
  trigger,
}: {
  account?: AnalyticAccount;
  plans: { id: number; name: string }[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(account?.ufa_type || "expense");
  const [planId, setPlanId] = useState(
    account?.plan_id ? String(account.plan_id[0]) : plans[0] ? String(plans[0].id) : "",
  );

  function onSave() {
    startTransition(async () => {
      try {
        await saveAnalyticAccount(account?.id ?? null, {
          name,
          ufa_type: type,
          plan_id: Number(planId),
        });
        toast.success(account ? "Analytic account updated." : "Analytic account added.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that analytic account.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit analytic account" : "New analytic account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="analytic-name">Name</Label>
            <Input id="analytic-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                items={ANALYTIC_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={type}
                onValueChange={(v) => v && setType(v as typeof type)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTIC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select
                items={plans.map((p) => ({ value: String(p.id), label: p.name }))}
                value={planId}
                onValueChange={(v) => v && setPlanId(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Analytic accounts tag income and spend to a project or department, so budgets can
            track actuals against them.
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !name || !planId}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save analytic account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
