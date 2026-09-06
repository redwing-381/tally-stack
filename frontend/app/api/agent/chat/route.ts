import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  type UIMessage,
} from "ai";
import { PERSONA_COOKIE } from "@/lib/odoo/session";
import { agentModel } from "@/lib/agent/model";
import { agentTools } from "@/lib/agent/tools";

const SYSTEM_PROMPT = `You help record Tally Stacks's accounting transactions in plain language.

Only use the tools you're given — never invent an id, order number, or amount. When a tool needs a
contact or product name, pass the name exactly as the user said it and let the tool resolve it; if a
lookup tool reports "not found" or "multiple matches", relay that to the user and ask them to clarify
rather than guessing.
Tools whose result includes "requiresConfirmation" have NOT happened yet — they are proposals the user
still needs to approve in the UI. Describe what you're proposing in one short sentence and stop; do not
say the action is done, and do not call the same tool again unless the user changes their request.
When asked to check for anomalies or unusual transactions, call detectAnomalies. If it finds one or more,
briefly describe each one, then propose fixing it with fixPriceAnomaly (passing back the exact lineId,
orderType, order, product, currentUnitPrice and catalogUnitPrice it reported) rather than waiting to be
asked separately.`;

/**
 * The real enforcement point for who can use the agent — the button's
 * absence in the UI is convenience, not security, matching the rest of
 * this app's "cookie decides what renders, our own checks decide what's
 * allowed" approach.
 */
export async function POST(req: Request) {
  const persona = (await cookies()).get(PERSONA_COOKIE)?.value;
  if (persona !== "admin" && persona !== "invoicing") {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: agentModel,
    system: SYSTEM_PROMPT,
    // convertToModelMessages is async in this SDK version (7.x) — it
    // wasn't in earlier majors, caught by the build's type check.
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    // streamText's real default is isStepCount(1) — a lone tool call would
    // otherwise end the whole response with no narration at all (confirmed
    // live: a status lookup returned the right data but zero text). 8 steps
    // covers "resolve name -> propose -> narrate" chains and the anomaly
    // flow (detect -> propose a fix per finding) without letting a confused
    // model loop indefinitely.
    stopWhen: stepCountIs(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
