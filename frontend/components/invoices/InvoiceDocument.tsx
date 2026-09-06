import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { callKw, OdooRpcError } from "@/lib/odoo/client";
import type { M2O } from "@/lib/odoo/types";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { PaymentButton } from "@/components/orders/PaymentButton";
import { PayNowButton } from "@/components/invoices/PayNowButton";
import { PaymentStatusPoller } from "@/components/invoices/PaymentStatusPoller";
import { PrintButton } from "@/components/invoices/PrintButton";
import { formatDate } from "@/lib/format";

interface Address {
  id: number;
  name: string;
  street: string | false;
  street2: string | false;
  city: string | false;
  zip: string | false;
  state_id: M2O;
  country_id: M2O;
  vat: string | false;
  email: string | false;
  phone: string | false;
}

interface Invoice {
  id: number;
  name: string;
  partner_id: [number, string];
  company_id: [number, string];
  invoice_date: string | false;
  invoice_date_due: string | false;
  ref: string | false;
  invoice_origin: string | false;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  state: string;
  move_type: "out_invoice" | "in_invoice" | string;
  currency_id: [number, string];
}

interface InvoiceLine {
  id: number;
  name: string;
  quantity: number;
  price_unit: number;
  price_subtotal: number;
  tax_ids: number[];
}

function addressLines(a: Address): string[] {
  return [
    a.street || undefined,
    a.street2 || undefined,
    [a.city || undefined, a.state_id ? a.state_id[1] : undefined, a.zip || undefined]
      .filter(Boolean)
      .join(", ") || undefined,
    a.country_id ? a.country_id[1] : undefined,
  ].filter((line): line is string => Boolean(line));
}

function currencySymbol(currency: [number, string]): string {
  return currency[1] === "USD" ? "$" : currency[1] === "EUR" ? "€" : "₹";
}

/**
 * Renders one invoice/bill as a formal document — used by both the internal
 * (Admin/Invoicing) Sales/Purchases drill-down and the customer portal.
 *
 * A few reads (company address, tax names) require internal-only model
 * access that a portal session doesn't have — see the raw RPC probes this
 * was built against. Those are wrapped to degrade gracefully instead of
 * crashing the page for portal users; everything about the invoice itself
 * (its own lines, its own partner) is already scoped correctly by Odoo's
 * own record rules on the session doing the read, so no manual partner_id
 * filtering happens here or anywhere upstream of this component.
 */
export async function InvoiceDocument({
  invoiceId,
  mode,
}: {
  invoiceId: number;
  mode: "internal" | "portal";
}) {
  let invoice: Invoice | undefined;
  try {
    [invoice] = await callKw<Invoice[]>("account.move", "read", [
      [invoiceId],
      [
        "name",
        "partner_id",
        "company_id",
        "invoice_date",
        "invoice_date_due",
        "ref",
        "invoice_origin",
        "amount_untaxed",
        "amount_tax",
        "amount_total",
        "amount_residual",
        "payment_state",
        "state",
        "move_type",
        "currency_id",
      ],
    ]);
  } catch (err) {
    // Odoo's own record rule already refuses this invoice if it isn't ours
    // (AccessError) — treat that identically to "doesn't exist" rather than
    // leaking which case it was.
    if (err instanceof OdooRpcError) notFound();
    throw err;
  }
  if (!invoice) notFound();

  const [lines, [partner], [company]] = await Promise.all([
    callKw<InvoiceLine[]>("account.move.line", "search_read", [
      [
        ["move_id", "=", invoiceId],
        ["display_type", "=", "product"],
      ],
      ["name", "quantity", "price_unit", "price_subtotal", "tax_ids"],
    ]),
    callKw<Address[]>("res.partner", "read", [
      [invoice.partner_id[0]],
      ["name", "street", "street2", "city", "zip", "state_id", "country_id", "vat", "email", "phone"],
    ]),
    callKw<Address[]>("res.partner", "read", [
      [invoice.company_id[0]],
      ["name", "street", "street2", "city", "zip", "state_id", "country_id", "vat", "email", "phone"],
    ]).catch(() => [] as Address[]),
  ]);

  const taxIds = [...new Set(lines.flatMap((l) => l.tax_ids))];
  const taxes = taxIds.length
    ? await callKw<Array<{ id: number; name: string }>>("account.tax", "read", [taxIds, ["name"]]).catch(
        () => [] as Array<{ id: number; name: string }>,
      )
    : [];
  const taxName = (ids: number[]) =>
    ids.map((tid) => taxes.find((t) => t.id === tid)?.name).filter(Boolean).join(", ") || "—";

  const symbol = currencySymbol(invoice.currency_id);
  const money = (n: number) =>
    `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isBill = invoice.move_type === "in_invoice";
  const docTitle = isBill ? "Bill" : "Tax Invoice";
  const backHref = mode === "portal" ? "/portal/invoices" : isBill ? "/purchases" : "/sales";
  const backLabel = mode === "portal" ? "My invoices" : isBill ? "Purchases" : "Sales";
  const unpaid = invoice.payment_state !== "paid" && invoice.state === "posted";

  return (
    <div className="p-10 print:p-0">
      {unpaid && <PaymentStatusPoller invoiceId={invoice.id} />}
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={14} /> {backLabel}
        </Link>
        <div className="flex items-center gap-3">
          {unpaid && mode === "internal" && (
            <PaymentButton moveId={invoice.id} redirectPath={`/invoices/${invoice.id}`} />
          )}
          {unpaid && mode === "portal" && <PayNowButton invoiceId={invoice.id} />}
          <a
            href={`/api/invoices/${invoice.id}/pdf?download=1`}
            className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
          >
            <Download size={14} /> Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl border border-border bg-card p-10 print:mt-0 print:max-w-none print:border-0 print:p-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="" width={44} height={44} />
            <div>
              <p className="font-heading text-lg">{company?.name ?? "Tally Stack"}</p>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {company ? addressLines(company).map((l) => <p key={l}>{l}</p>) : null}
                {company?.vat && <p>GSTIN {company.vat}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-heading text-2xl">{docTitle}</h1>
            <p className="mt-1 font-mono text-sm">{invoice.name}</p>
            {/* Document state and payment state are separate lifecycles —
                "Posted" only means the entry is finalized, never that it's
                been paid. */}
            <div className="mt-2 flex justify-end gap-2">
              <StatusBadge value={invoice.state} />
              <StatusBadge value={invoice.payment_state} />
            </div>
          </div>
        </div>

        <div className="rule-subtotal mt-8 grid grid-cols-2 gap-8 pt-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{isBill ? "Vendor" : "Bill to"}</p>
            <p className="mt-1 font-medium">{partner.name}</p>
            <div className="mt-0.5 text-muted-foreground">
              {addressLines(partner).map((l) => (
                <p key={l}>{l}</p>
              ))}
              {partner.vat && <p>GSTIN {partner.vat}</p>}
              {partner.email && <p>{partner.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <dl className="space-y-1">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Invoice date</dt>
                <dd>{formatDate(invoice.invoice_date)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Due date</dt>
                <dd>{formatDate(invoice.invoice_date_due)}</dd>
              </div>
              {invoice.invoice_origin && (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>{invoice.invoice_origin}</dd>
                </div>
              )}
              {invoice.ref && (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd>{invoice.ref}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="rule-subtotal text-left text-muted-foreground">
              <th className="py-2 font-normal">Description</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Unit price</th>
              <th className="py-2 text-right font-normal">Tax</th>
              <th className="py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="py-2.5">{l.name}</td>
                <td className="tabular py-2.5 text-right font-mono">{l.quantity}</td>
                <td className="tabular py-2.5 text-right font-mono">{money(l.price_unit)}</td>
                <td className="py-2.5 text-right text-muted-foreground">{taxName(l.tax_ids)}</td>
                <td className="tabular py-2.5 text-right font-mono">{money(l.price_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Untaxed amount</dt>
              <dd className="tabular font-mono">{money(invoice.amount_untaxed)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular font-mono">{money(invoice.amount_tax)}</dd>
            </div>
            <div className="rule-total flex justify-between py-1.5 font-medium">
              <dt>Total</dt>
              <dd className="tabular font-mono">{money(invoice.amount_total)}</dd>
            </div>
            {invoice.amount_residual > 0 && (
              <div className="flex justify-between text-destructive">
                <dt>Amount due</dt>
                <dd className="tabular font-mono">{money(invoice.amount_residual)}</dd>
              </div>
            )}
          </dl>
        </div>

        <p className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
          {invoice.payment_state === "paid"
            ? "Paid in full. Thank you for your business."
            : "Please settle this amount by the due date shown above."}
        </p>
      </div>
    </div>
  );
}
