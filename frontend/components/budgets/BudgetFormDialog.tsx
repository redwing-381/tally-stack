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
import { saveBudget } from "@/lib/odoo/actions";
import type { Budget } from "@/lib/odoo/types";

export function BudgetFormDialog({
  budget,
  analyticAccounts,
  users,
  trigger,
}: {
  budget?: Budget;
  analyticAccounts: { id: number; name: string }[];
  users: { id: number; name: string }[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(budget?.name ?? "");
  const [periodStart, setPeriodStart] = useState(budget?.period_start ?? "");
  const [periodEnd, setPeriodEnd] = useState(budget?.period_end ?? "");
  const [analyticId, setAnalyticId] = useState(
    budget?.analytic_account_id ? String(budget.analytic_account_id[0]) : "",
  );
  const [planned, setPlanned] = useState(budget ? String(budget.planned_amount) : "");
  const [responsibleId, setResponsibleId] = useState(
    budget?.responsible_user_id ? String(budget.responsible_user_id[0]) : "",
  );

  function onSave() {
    if (!name || !periodStart || !periodEnd || !analyticId || !planned) return;
    startTransition(async () => {
      try {
        await saveBudget(budget?.id ?? null, {
          name,
          period_start: periodStart,
          period_end: periodEnd,
          analytic_account_id: Number(analyticId),
          planned_amount: Number(planned),
          responsible_user_id: responsibleId ? Number(responsibleId) : false,
        });
        toast.success(budget ? "Budget updated." : "Budget created.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that budget.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "New budget"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Name</Label>
            <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-start">Period start</Label>
              <Input id="b-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-end">Period end</Label>
              <Input id="b-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Analytic account</Label>
            <Select
              items={analyticAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
              value={analyticId}
              onValueChange={(v) => setAnalyticId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {analyticAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-planned">Planned amount</Label>
              <Input
                id="b-planned"
                type="number"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsible person</Label>
              <Select
                items={users.map((u) => ({ value: String(u.id), label: u.name }))}
                value={responsibleId}
                onValueChange={(v) => setResponsibleId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !name || !periodStart || !periodEnd || !analyticId || !planned}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
