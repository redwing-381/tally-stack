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
import { saveJournal } from "@/lib/odoo/actions";
import { JOURNAL_TYPES } from "@/lib/accounting";
import type { Journal } from "@/lib/odoo/types";

export function JournalFormDialog({
  journal,
  accounts,
  trigger,
}: {
  journal?: Journal;
  accounts: { id: number; name: string; code: string }[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(journal?.name ?? "");
  const [code, setCode] = useState(journal?.code ?? "");
  const [type, setType] = useState<Journal["type"]>(journal?.type ?? "sale");
  const [accountId, setAccountId] = useState(
    journal?.default_account_id ? String(journal.default_account_id[0]) : "",
  );

  function onSave() {
    startTransition(async () => {
      try {
        await saveJournal(journal?.id ?? null, {
          name,
          code,
          type,
          default_account_id: accountId ? Number(accountId) : false,
        });
        toast.success(journal ? "Journal updated." : "Journal added.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that journal. Check the short code isn't already used.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{journal ? "Edit journal" : "New journal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[7rem_1fr] gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="journal-code">Short code</Label>
              <Input
                id="journal-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="journal-name">Journal name</Label>
              <Input id="journal-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              items={JOURNAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={type}
              onValueChange={(v) => v && setType(v as Journal["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default account</Label>
            <Select
              items={accounts.map((a) => ({ value: String(a.id), label: `${a.code} · ${a.name}` }))}
              value={accountId}
              onValueChange={(v) => v && setAccountId(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Where entries in this journal post by default.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !name || !code}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save journal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
