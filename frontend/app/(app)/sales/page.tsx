import Link from "next/link";
import { redirect } from "next/navigation";
import { searchRead, searchCount } from "@/lib/odoo/client";
import { getCatalogProducts } from "@/lib/odoo/queries";
import type { SaleOrder } from "@/lib/odoo/types";
import { NewOrderDialog } from "@/components/orders/NewOrderDialog";
import { StatusBadge } from "@/components/orders/StatusBadge";
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

export default async function SalesPage(props: PageProps<"/sales">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  const [orders, total, customers, products, taxes] = await Promise.all([
    searchRead<SaleOrder>(
      "sale.order",
      [],
      ["name", "partner_id", "date_order", "amount_total", "state"],
      { order: "date_order desc", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("sale.order"),
    searchRead<{ id: number; name: string }>("res.partner", [["customer_rank", ">", 0]], ["name"], {
      order: "name",
    }),
    // Our own furniture catalog only — see getCatalogProducts for why a
    // policy-only filter isn't precise enough. Not paginated: it's a picker
    // for the new-order dialog, not part of the listing.
    getCatalogProducts(),
    searchRead<{ id: number; name: string }>(
      "account.tax",
      [["type_tax_use", "=", "sale"]],
      ["name"],
      { order: "sequence" },
    ),
  ]);

  if (total > 0 && page > 1 && orders.length === 0) {
    redirect(buildPageHref("/sales", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Orders, invoices and payments.</p>
        </div>
        <NewOrderDialog kind="sale" partners={customers} products={products} taxes={taxes} partnerLabel="Customer" />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link href={`/sales/${o.id}`} className="font-medium hover:text-accent">
                  {o.name}
                </Link>
              </TableCell>
              <TableCell>{o.partner_id ? o.partner_id[1] : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(o.date_order)}</TableCell>
              <TableCell>
                <StatusBadge value={o.state} />
              </TableCell>
              <TableCell className="tabular text-right font-mono">
                {formatMoney(o.amount_total)}
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No sales orders yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/sales" />
    </div>
  );
}
