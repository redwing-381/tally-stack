import { NextResponse } from "next/server";
import { callKw, OdooRpcError } from "@/lib/odoo/client";

/**
 * Thin authenticated proxy to Odoo's call_kw, reserved for imperative
 * client-side reads (e.g. debounced pickers). All mutations go through
 * Server Actions in lib/odoo/actions.ts instead.
 */
export async function POST(request: Request) {
  const { model, method, args, kwargs } = (await request.json()) as {
    model: string;
    method: string;
    args?: unknown[];
    kwargs?: Record<string, unknown>;
  };

  const READ_ONLY = new Set(["search_read", "read", "search", "read_group", "name_search"]);
  if (!READ_ONLY.has(method)) {
    return NextResponse.json({ ok: false, error: "Method not allowed via this endpoint." }, { status: 403 });
  }

  try {
    const result = await callKw(model, method, args ?? [], kwargs ?? {});
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof OdooRpcError ? err.message : "Request failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
