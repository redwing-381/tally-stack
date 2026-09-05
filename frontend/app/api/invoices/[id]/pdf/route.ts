import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/odoo/session";

const ODOO_URL = process.env.ODOO_URL ?? "http://localhost:8069";

/**
 * Streams Odoo's own invoice PDF report (the same one behind Print >
 * Invoices in the native web client) through our server, reusing the
 * ufa_session cookie's session_id as Odoo's own — the browser never gets
 * an Odoo-origin cookie of its own, so this is the only way it can reach
 * a report URL that Odoo's controller normally gates on that session.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const res = await fetch(`${ODOO_URL}/report/pdf/account.report_invoice_with_payments/${id}`, {
    headers: { Cookie: `session_id=${sessionId}` },
    cache: "no-store",
  });

  if (!res.ok || res.headers.get("content-type")?.includes("text/html")) {
    return NextResponse.json({ ok: false, error: "Could not generate the PDF." }, { status: 502 });
  }

  const bytes = await res.arrayBuffer();
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="invoice-${id}.pdf"`,
    },
  });
}
