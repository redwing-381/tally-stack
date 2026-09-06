"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { Bot, Send, SquarePen, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolConfirmCard, type Proposal, type Resolution } from "@/components/agent/ToolConfirmCard";

const EXAMPLE_PROMPTS = [
  "Create a purchase order for Rahul Sharma for 10 Wooden Tables",
  "Create a sales order for Nimesh Pathak for 5 Office Chairs",
  "What's the status of invoice INV/2026/00001?",
  "Check the draft orders for pricing anomalies",
];

function messageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export function AgentPanel({ onClose, onNewChat }: { onClose: () => void; onNewChat: () => void }) {
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const suggestedFor = useRef<string | null>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, followUps]);

  // Fetched separately from the main chat stream — see the route's comment
  // on why a cheap chat model can't be trusted to reliably call a
  // "suggest follow-ups" tool on its own.
  //
  // A message ending in a pending proposal isn't a finished turn yet — the
  // user still has to hit Confirm/Cancel on the card, which happens outside
  // the chat protocol entirely (see ToolConfirmCard). Asking for follow-ups
  // right when the proposal appears means the model can only see "assistant
  // proposed X, awaiting approval" and naturally suggests approving it —
  // producing a chip that duplicates the card's own Confirm button. Clicking
  // that chip re-sends the proposal as a new chat turn, which either asks to
  // confirm all over again or, worse, re-runs a write tool against state the
  // first confirm already changed (e.g. re-confirming an order that's no
  // longer draft), which is the error the user hit. So: wait until every
  // proposal in the last assistant message has actually been resolved
  // (tracked in `resolutions`, set by ToolConfirmCard's onResolved) before
  // asking for follow-ups, and tell the suggester what happened.
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;

    const proposalIds = last.parts
      .filter(isToolUIPart)
      .filter((p) => p.state === "output-available")
      .filter((p) => {
        const output = p.output as Proposal | { message?: string } | undefined;
        return !!output && "requiresConfirmation" in output && output.requiresConfirmation;
      })
      .map((p) => p.toolCallId);

    if (!proposalIds.every((id) => id in resolutions)) return; // still waiting on a Confirm/Cancel click

    const suggestKey = last.id + ":" + proposalIds.map((id) => resolutions[id]?.status ?? "").join(",");
    if (suggestedFor.current === suggestKey) return;

    const assistantText = messageText(last);
    const resolutionNote = proposalIds
      .map((id) => resolutions[id])
      .map((r) =>
        r.status === "confirmed"
          ? `The proposed action was confirmed and completed: ${r.message}`
          : r.status === "cancelled"
            ? "The proposed action was cancelled by the user."
            : `The proposed action failed: ${r.message}`,
      )
      .join(" ");
    const combinedAssistantText = [assistantText, resolutionNote].filter(Boolean).join(" ");
    if (!combinedAssistantText) return;

    suggestedFor.current = suggestKey;
    const priorUser = [...messages].slice(0, -1).reverse().find((m) => m.role === "user");

    fetch("/api/agent/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userText: priorUser ? messageText(priorUser) : "", assistantText: combinedAssistantText }),
    })
      .then((res) => res.json())
      .then((data) => setFollowUps(Array.isArray(data.suggestions) ? data.suggestions : []))
      .catch(() => setFollowUps([]));
  }, [status, messages, resolutions]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setFollowUps([]);
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[90vw] flex-col border-l border-border bg-background shadow-xl print:hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Bot size={15} />
          </div>
          <p className="font-heading text-lg">Assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewChat}
            className="text-muted-foreground hover:text-foreground"
            aria-label="New chat"
            title="New chat"
          >
            <SquarePen size={17} />
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tell me what to record — I can create sales and purchase orders, generate invoices and
              bills, register payments, and look up statuses and reports.
            </p>
            <div className="space-y-1.5">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="block w-full border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id} className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  isUser ? "bg-secondary text-foreground" : "bg-accent/15 text-accent",
                )}
              >
                {isUser ? <User size={12} /> : <Bot size={12} />}
              </div>
              <div className={cn("max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p
                        key={i}
                        className={cn(
                          "text-sm",
                          isUser
                            ? "bg-secondary px-3 py-2 text-foreground"
                            : "border border-border bg-card px-3 py-2 text-foreground",
                        )}
                      >
                        {part.text}
                      </p>
                    );
                  }
                  if (isToolUIPart(part)) {
                    if (part.state === "output-available") {
                      const output = part.output as Proposal | { message?: string } | undefined;
                      if (output && "requiresConfirmation" in output && output.requiresConfirmation) {
                        return (
                          <ToolConfirmCard
                            key={part.toolCallId}
                            proposal={output}
                            onResolved={(resolution) => {
                              setFollowUps([]);
                              setResolutions((prev) => ({ ...prev, [part.toolCallId]: resolution }));
                            }}
                          />
                        );
                      }
                      return null; // read-tool result — the assistant's own text narrates it
                    }
                    if (part.state === "output-error") {
                      return (
                        <p key={i} className="text-sm text-destructive">
                          {part.errorText}
                        </p>
                      );
                    }
                    return (
                      <p key={i} className="text-xs text-muted-foreground">
                        Working…
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bot size={12} />
            </div>
            <p className="text-xs text-muted-foreground">Thinking…</p>
          </div>
        )}

        {status === "ready" && followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {followUps.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Create a sales order for..."
          disabled={status !== "ready"}
          className="h-9 flex-1 border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center bg-accent text-accent-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
