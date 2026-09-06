import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { searchRead } from "@/lib/odoo/client";
import {
  savePartner,
  createSaleOrder,
  confirmSaleOrder,
  createSaleInvoice,
  createPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseBill,
  registerPayment,
} from "@/lib/odoo/actions";
import { resolveJournal } from "@/lib/agent/lookups";
import { PERSONA_COOKIE } from "@/lib/odoo/session";

type OrderLine = { productId: number; qty: number };

/**
 * The only place a write from the agent ever actually happens. Called
 * directly by the Confirm button — outside the chat message protocol
 * entirely — with the exact args a tool proposed. Each case calls the same
 * Server Action the manual UI uses, so Odoo's own ACLs/record rules are
 * what decide what's actually allowed, same as everywhere else in this app.
 */
export async function POST(req: Request) {
  const persona = (await cookies()).get(PERSONA_COOKIE)?.value;
  if (persona !== "admin" && persona !== "invoicing") {
    return NextResponse.json({ ok: false, error: "Not permitted" }, { status: 403 });
  }

  const { toolName, args } = (await req.json()) as { toolName: string; args: Record<string, unknown> };

  try {
    switch (toolName) {
      case "createContact": {
        const a = args as { name: string; partner_type: "customer" | "vendor" | "both"; email?: string; phone?: string; city?: string };
        await savePartner(null, a);
        return NextResponse.json({ ok: true, message: `Contact "${a.name}" created.` });
      }

      case "createSalesOrder": {
        const a = args as { partnerId: number; lines: OrderLine[] };
        const orderId = await createSaleOrder(a.partnerId, a.lines);
        const [order] = await searchRead<{ name: string }>("sale.order", [["id", "=", orderId]], ["name"]);
        return NextResponse.json({ ok: true, message: `Sales order ${order.name} created.`, orderReference: order.name });
      }

      case "confirmSalesOrder": {
        const a = args as { orderId: number };
        await confirmSaleOrder(a.orderId);
        const [order] = await searchRead<{ name: string }>("sale.order", [["id", "=", a.orderId]], ["name"]);
        return NextResponse.json({ ok: true, message: `${order.name} confirmed.` });
      }

      case "createSalesInvoice": {
        const a = args as { orderId: number };
        const invoiceIds = await createSaleInvoice(a.orderId);
        const invoices = await searchRead<{ name: string }>("account.move", [["id", "in", invoiceIds]], ["name"]);
        const names = invoices.map((i) => i.name).join(", ");
        return NextResponse.json({ ok: true, message: `Invoice ${names} generated and posted.`, invoiceReference: invoices[0]?.name });
      }

      case "createPurchaseOrder": {
        const a = args as { partnerId: number; lines: OrderLine[] };
        const orderId = await createPurchaseOrder(a.partnerId, a.lines);
        const [order] = await searchRead<{ name: string }>("purchase.order", [["id", "=", orderId]], ["name"]);
        return NextResponse.json({ ok: true, message: `Purchase order ${order.name} created.`, orderReference: order.name });
      }

      case "confirmPurchaseOrder": {
        const a = args as { orderId: number };
        await confirmPurchaseOrder(a.orderId);
        const [order] = await searchRead<{ name: string }>("purchase.order", [["id", "=", a.orderId]], ["name"]);
        return NextResponse.json({ ok: true, message: `${order.name} confirmed.` });
      }

      case "createPurchaseBill": {
        const a = args as { orderId: number };
        const billIds = await createPurchaseBill(a.orderId);
        const bills = await searchRead<{ name: string }>("account.move", [["id", "in", billIds]], ["name"]);
        const names = bills.map((b) => b.name).join(", ");
        return NextResponse.json({ ok: true, message: `Bill ${names} generated and posted.`, invoiceReference: bills[0]?.name });
      }

      case "registerPayment": {
        const a = args as { moveId: number; journal: "bank" | "cash" };
        const journal = await resolveJournal(a.journal);
        await registerPayment(a.moveId, "/dashboard", journal.id);
        const [move] = await searchRead<{ name: string }>("account.move", [["id", "=", a.moveId]], ["name"]);
        return NextResponse.json({ ok: true, message: `Payment registered for ${move.name} via ${journal.name}.` });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown tool "${toolName}".` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
