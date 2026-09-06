"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't sign in. Check the login and password.");
        setPending(false);
        return;
      }

      const home = data.persona === "portal" ? "/portal/invoices" : "/dashboard";
      router.push(params.get("next") ?? home);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Is Odoo running?");
      setPending(false);
    }
  }

  const notice = params.get("reset")
    ? "Password reset — sign in with your new password."
    : params.get("created")
      ? "Account created — sign in to continue."
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-border bg-card p-8">
      {notice && (
        <p className="border-l-2 border-primary pl-3 text-sm text-foreground">{notice}</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="login">Login</Label>
        <Input
          id="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          placeholder="you@urbanfurniture.example"
          required
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
