"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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

export function NewCustomerLoginDialog({ contacts }: { contacts: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [partnerId, setPartnerId] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPartnerId("");
    setLogin("");
    setPassword("");
    setError(null);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "customer", partner_id: Number(partnerId), login, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Couldn't create the login.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2">
            <UserPlus size={15} /> Customer login
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant a customer portal access</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Picks an existing contact — this can&apos;t create a new one — and gives them a login
            that can sign in immediately to view and pay only their own invoices and bills.
          </p>
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select
              items={contacts.map((c) => ({ value: String(c.id), label: c.name }))}
              value={partnerId}
              onValueChange={(v) => setPartnerId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
                {contacts.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Every customer already has a login.
                  </p>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-login">Login id</Label>
            <Input id="cl-login" value={login} onChange={(e) => setLogin(e.target.value)} />
            <p className="text-xs text-muted-foreground">6–12 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-password">Password</Label>
            <Input
              id="cl-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              More than 8 characters, with an uppercase letter, a lowercase letter, and a special
              character.
            </p>
          </div>

          {error && (
            <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !partnerId || !login || !password}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Creating…" : "Grant access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
