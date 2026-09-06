import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { searchRead } from "@/lib/odoo/client";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { PaymentButton } from "@/components/orders/PaymentButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/format";

interface Bill {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date_due: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
}

export default async function OutstandingPayablesPage() {
  const bills = await searchRead<Bill>(
    "account.move",
    [
      ["move_type", "=", "in_invoice"],
      ["state", "=", "posted"],
      ["payment_state", "not in", ["paid", "reversed"]],
    ],
    ["name", "partner_id", "invoice_date_due", "amount_total", "amount_residual", "payment_state"],
    { order: "invoice_date_due" },
  );

  const total = bills.reduce((sum, b) => sum + b.amount_residual, 0);

  return (
    <div className="p-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={14} /> Dashboard
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Outstanding payables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendor bills still owed — register a payment straight from here.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total due</p>
          <p className="tabular font-mono text-2xl text-destructive">{formatMoney(total)}</p>
        </div>
      </div>

      <Table containerClassName="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Bill</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount due</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell>{b.partner_id ? b.partner_id[1] : "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {b.invoice_date_due ? formatDate(b.invoice_date_due) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge value={b.payment_state} />
              </TableCell>
              <TableCell className="tabular text-right font-mono">
                {formatMoney(b.amount_residual)}
              </TableCell>
              <TableCell className="text-right">
                <PaymentButton moveId={b.id} redirectPath="/purchases/outstanding" />
              </TableCell>
            </TableRow>
          ))}
          {bills.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nothing outstanding — all vendor bills are paid.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
