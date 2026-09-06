"use client";

import { useState } from "react";
import { Check, CircleX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Proposal {
  requiresConfirmation: true;
  toolName: string;
  summary: string;
  args: Record<string, unknown>;
}

type Resolution = { status: "confirmed"; message: string } | { status: "cancelled" } | { status: "error"; message: string };

/**
 * One proposed write action, rendered like the app's own ledger documents
 * (bordered box, label, ledger rule) rather than a generic chat bubble —
 * so a proposed purchase order reads as a miniature version of the real
 * document it's about to create.
 */
export function ToolConfirmCard({ proposal, onResolved }: { proposal: Proposal; onResolved?: () => void }) {
  const [pending, setPending] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);

  async function confirm() {
    setPending(true);
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: proposal.toolName, args: proposal.args }),
      });
      const data = await res.json();
      setResolution(
        data.ok ? { status: "confirmed", message: data.message } : { status: "error", message: data.error },
      );
    } catch {
      setResolution({ status: "error", message: "Couldn't reach the server." });
    } finally {
      setPending(false);
      onResolved?.();
    }
  }

  function cancel() {
    setResolution({ status: "cancelled" });
    onResolved?.();
  }

  if (resolution) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border px-3 py-2 text-sm",
          resolution.status === "confirmed" && "border-success/40 bg-success/5 text-success",
          resolution.status === "cancelled" && "border-border bg-secondary text-muted-foreground",
          resolution.status === "error" && "border-destructive/40 bg-destructive/5 text-destructive",
        )}
      >
        {resolution.status === "confirmed" && <Check size={14} />}
        {resolution.status === "cancelled" && <CircleX size={14} />}
        <span>
          {resolution.status === "confirmed" && resolution.message}
          {resolution.status === "cancelled" && "Cancelled."}
          {resolution.status === "error" && `Couldn't do that: ${resolution.message}`}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card">
      <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">Proposed action</p>
      <p className="px-3 py-3 text-sm">{proposal.summary}</p>
      <div className="rule-subtotal flex items-center justify-end gap-2 px-3 py-2">
        <Button size="sm" variant="outline" onClick={cancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={confirm}
          disabled={pending}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
