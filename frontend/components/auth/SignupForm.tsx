"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't create the account.");
        setPending(false);
        return;
      }

      router.push("/login?created=1");
    } catch {
      setError("Couldn't reach the server. Is Odoo running?");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-border bg-card p-8">
      <p className="text-sm text-muted-foreground">
        For customers with an existing invoice or bill — use the same email an Admin or
        Invoicing user has on file for you, and you&apos;ll be able to view and pay your own
        invoices.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="login">Login id</Label>
        <Input
          id="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          minLength={6}
          maxLength={12}
          required
        />
        <p className="text-xs text-muted-foreground">6–12 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email id</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          More than 8 characters, with an uppercase letter, a lowercase letter, and a
          special character.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Re-enter password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {pending ? "Creating account…" : "Sign up"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
