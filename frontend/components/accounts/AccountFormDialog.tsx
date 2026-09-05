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
import { saveAccount } from "@/lib/odoo/actions";
import { ACCOUNT_TYPES, ACCOUNT_FAMILIES } from "@/lib/accounting";
import type { Account } from "@/lib/odoo/types";

export function AccountFormDialog({
  account,
  trigger,
}: {
  account?: Account;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(account?.name ?? "");
  const [code, setCode] = useState(account?.code ?? "");
  const [type, setType] = useState(account?.account_type ?? "asset_current");

  function onSave() {
    startTransition(async () => {
      try {
        await saveAccount(account?.id ?? null, { name, code, account_type: type });
        toast.success(account ? "Account updated." : "Account added.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that account. Check the code isn't already used.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[7rem_1fr] gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-code">Code</Label>
              <Input
                id="account-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Account name</Label>
              <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              items={ACCOUNT_TYPES.map((t) => ({
                value: t.value,
                label: `${t.family} · ${t.label}`,
              }))}
              value={type}
              onValueChange={(v) => v && setType(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_FAMILIES.map((family) => (
                  <div key={family}>
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">{family}</p>
                    {ACCOUNT_TYPES.filter((t) => t.family === family).map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The type decides which report the account lands in and how it posts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !name || !code}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
