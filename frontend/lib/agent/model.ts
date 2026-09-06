import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Server-only: never imported from a "use client" file. No NEXT_PUBLIC_
// prefix, so Next.js already refuses to inline this into a client bundle —
// same discipline as ODOO_URL / RAZORPAY_PROVIDER_ID elsewhere in this app.
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export const agentModel = openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini");
