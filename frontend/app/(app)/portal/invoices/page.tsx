import Link from "next/link";
import { redirect } from "next/navigation";
import { searchRead, searchCount } from "@/lib/odoo/client";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { PaymentStatusPoller } from "@/components/invoices/PaymentStatusPoller";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage, pageOffset, pageCount, buildPageHref } from "@/lib/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/format";

interface PortalInvoice {
  id: number;
  name: string;
  invoice_date: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
}

export default async function PortalInvoicesPage(props: PageProps<"/portal/invoices">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  // No partner filter here on purpose — Odoo's own record rule for the
  // portal group already scopes account.move reads to this session's own
  // partner, for the count as much as the rows. Filtering by partner_id
  // ourselves would just duplicate a check Odoo already enforces.
  const domain = [
    ["move_type", "=", "out_invoice"],
    ["state", "=", "posted"],
  ];

  const [invoices, total] = await Promise.all([
    searchRead<PortalInvoice>(
      "account.move",
      domain,
      ["name", "invoice_date", "amount_total", "amount_residual", "payment_state"],
      { order: "invoice_date desc", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("account.move", domain),
  ]);

  if (total > 0 && page > 1 && invoices.length === 0) {
    redirect(buildPageHref("/portal/invoices", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="shrink-0">
        <h1 className="font-heading text-2xl">My invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything billed to your account.</p>
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                {inv.payment_state !== "paid" && <PaymentStatusPoller invoiceId={inv.id} />}
                <Link href={`/portal/invoices/${inv.id}`} className="font-medium hover:text-accent">
                  {inv.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(inv.invoice_date)}</TableCell>
              <TableCell>
                <StatusBadge value={inv.payment_state} />
              </TableCell>
              <TableCell className="tabular text-right font-mono">{formatMoney(inv.amount_total)}</TableCell>
              <TableCell className="tabular text-right font-mono">
                {formatMoney(inv.amount_residual)}
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No invoices yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/portal/invoices" />
    </div>
  );
}
