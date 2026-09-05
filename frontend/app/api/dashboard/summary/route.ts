import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/odoo/queries";
import { OdooRpcError } from "@/lib/odoo/client";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof OdooRpcError ? err.message : "Failed to load dashboard.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
