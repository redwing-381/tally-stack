import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { callKw } from "@/lib/odoo/client";
import type { AccountMove } from "@/lib/odoo/types";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { SaleOrderActions } from "@/components/orders/SaleOrderActions";
import { PaymentButton } from "@/components/orders/PaymentButton";
import { PaymentStatusPoller } from "@/components/invoices/PaymentStatusPoller";
import { formatMoney, formatDate } from "@/lib/format";

interface OrderLine {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
}

interface OrderDetail {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  amount_total: number;
  state: string;
  invoice_ids: number[];
  order_line: number[];
}

export default async function SaleOrderDetailPage(props: PageProps<"/sales/[id]">) {
  const { id } = await props.params;
  const orderId = Number(id);

  const [order] = await callKw<OrderDetail[]>("sale.order", "read", [
    [orderId],
    ["name", "partner_id", "date_order", "amount_total", "state", "invoice_ids", "order_line"],
  ]);
  if (!order) notFound();

  const [lines, invoices] = await Promise.all([
    callKw<OrderLine[]>("sale.order.line", "read", [
      order.order_line,
      ["product_id", "product_uom_qty", "price_unit", "price_subtotal"],
    ]),
    order.invoice_ids.length
      ? callKw<AccountMove[]>("account.move", "read", [
          order.invoice_ids,
          ["name", "state", "payment_state", "amount_total", "amount_residual"],
        ])
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-10">
      <Link href="/sales" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft size={14} /> Sales
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">{order.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.partner_id[1]} · {formatDate(order.date_order)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={order.state} />
          <SaleOrderActions orderId={order.id} state={order.state} hasInvoice={order.invoice_ids.length > 0} />
        </div>
      </div>

      <div className="mt-8 border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-normal">Product</th>
              <th className="px-4 py-3 text-right font-normal">Qty</th>
              <th className="px-4 py-3 text-right font-normal">Unit price</th>
              <th className="px-4 py-3 text-right font-normal">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{l.product_id[1]}</td>
                <td className="tabular px-4 py-3 text-right font-mono">{l.product_uom_qty}</td>
                <td className="tabular px-4 py-3 text-right font-mono">{formatMoney(l.price_unit)}</td>
                <td className="tabular px-4 py-3 text-right font-mono">{formatMoney(l.price_subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rule-total">
              <td colSpan={3} className="px-4 py-3 text-right font-medium">Total</td>
              <td className="tabular px-4 py-3 text-right font-mono font-medium">
                {formatMoney(order.amount_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoices.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg">Invoices</h2>
          <div className="mt-3 space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-accent">
                    {inv.name}
                  </Link>
                  <StatusBadge value={inv.payment_state} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="tabular font-mono text-sm text-muted-foreground">
                    {formatMoney(inv.amount_residual)} due
                  </span>
                  {inv.payment_state !== "paid" && inv.state === "posted" && (
                    <>
                      <PaymentStatusPoller invoiceId={inv.id} />
                      <PaymentButton moveId={inv.id} redirectPath={`/sales/${orderId}`} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
