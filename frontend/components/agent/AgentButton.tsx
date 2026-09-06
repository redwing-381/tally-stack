"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import type { Persona } from "@/lib/odoo/types";
import { AgentPanel } from "@/components/agent/AgentPanel";

/**
 * Floating entry point for the assistant — Admin and Invoicing User only,
 * per the spec (only those personas create master data/transactions; the
 * Contact/Portal persona already has its own scoped invoice/pay pages).
 * This is convenience, not the security boundary: both /api/agent routes
 * enforce the same persona check server-side regardless of what renders.
 */
export function AgentButton({ persona }: { persona: Persona }) {
  const [open, setOpen] = useState(false);
  // Bumping this remounts AgentPanel with a fresh useChat instance — the
  // simplest reliable way to start a new conversation without depending on
  // a reset API from a specific SDK version.
  const [chatKey, setChatKey] = useState(0);
  if (persona !== "admin" && persona !== "invoicing") return null;

  return (
    <>
      {open && (
        <AgentPanel
          key={chatKey}
          onClose={() => setOpen(false)}
          onNewChat={() => setChatKey((k) => k + 1)}
        />
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 print:hidden"
          aria-label="Open assistant"
        >
          <Bot size={22} />
        </button>
      )}
    </>
  );
}
