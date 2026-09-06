"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [login, setLogin] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    }).catch(() => undefined);
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-5 border border-border bg-card p-8 text-center">
        <p className="text-sm text-foreground">
          If an account exists for <span className="font-medium">{login}</span>, we&apos;ve sent
          a link to reset the password.
        </p>
        <Link href="/login" className="inline-block text-sm text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-border bg-card p-8">
      <p className="text-sm text-muted-foreground">
        Enter your login or email and we&apos;ll send a link to reset your password.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="login">Login or email</Label>
        <Input
          id="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          placeholder="you@urbanfurniture.example"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
