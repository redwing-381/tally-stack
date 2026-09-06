"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TokenState =
  | { status: "checking" }
  | { status: "valid"; name?: string; login?: string }
  | { status: "invalid"; error: string };

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [tokenState, setTokenState] = useState<TokenState>({ status: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState({ status: "invalid", error: "This reset link is missing its token." });
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setTokenState({ status: "valid", name: data.name, login: data.login });
        } else {
          setTokenState({ status: "invalid", error: data.error ?? "This reset link is invalid." });
        }
      })
      .catch(() => setTokenState({ status: "invalid", error: "Couldn't reach the server." }));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't reset the password.");
        setPending(false);
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setError("Couldn't reach the server. Is Odoo running?");
      setPending(false);
    }
  }

  if (tokenState.status === "checking") {
    return (
      <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Checking your reset link…
      </div>
    );
  }

  if (tokenState.status === "invalid") {
    return (
      <div className="space-y-5 border border-border bg-card p-8 text-center">
        <p className="border-l-2 border-destructive pl-3 text-left text-sm text-destructive">
          {tokenState.error}
        </p>
        <Link href="/forgot-password" className="inline-block text-sm text-accent hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-border bg-card p-8">
      <p className="text-sm text-muted-foreground">
        {tokenState.name ? (
          <>
            Setting a new password for <span className="font-medium text-foreground">{tokenState.name}</span>.
          </>
        ) : (
          "Choose a new password."
        )}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
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
        <Label htmlFor="confirm">Confirm password</Label>
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
        {pending ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
