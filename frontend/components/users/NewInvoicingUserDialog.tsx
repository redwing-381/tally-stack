"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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

export function NewInvoicingUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setLogin("");
    setEmail("");
    setPassword("");
    setError(null);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "invoicing", name, login, email, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Couldn't create the account.");
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
            <Plus size={15} /> Invoicing user
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Invoicing user</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Creates a real login they can sign in with immediately — no separate reset-password
            step. They&apos;ll be able to create master data, record transactions, and view
            reports, but not modify security settings.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="iu-name">Name</Label>
            <Input id="iu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="iu-login">Login id</Label>
              <Input id="iu-login" value={login} onChange={(e) => setLogin(e.target.value)} />
              <p className="text-xs text-muted-foreground">6–12 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iu-email">Email</Label>
              <Input
                id="iu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iu-password">Password</Label>
            <Input
              id="iu-password"
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
            disabled={pending || !name || !login || !email || !password}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Creating…" : "Create login"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
