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
  const pipelineOnly =
    (Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status) === "pipeline";
  // Same domain the dashboard's Sales pipeline card counts — an order stops
  // being "pipeline" the moment it's fully invoiced, confirmed or not.
  const domain = pipelineOnly
    ? [
        ["state", "!=", "cancel"],
        ["invoice_status", "!=", "invoiced"],
      ]
    : [];

  const [orders, total, customers, products, taxes, analyticAccounts] = await Promise.all([
    searchRead<SaleOrder>(
      "sale.order",
      domain,
      ["name", "partner_id", "date_order", "amount_total", "state", "invoice_status"],
      { order: "date_order desc", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("sale.order", domain),
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
    // For tagging order lines so a Budget's Actual (computed from posted
    // analytic lines) has something real to sum once the order is invoiced.
    searchRead<{ id: number; name: string }>("account.analytic.account", [], ["name"], {
      order: "name",
    }),
  ]);

  const query = pipelineOnly ? { status: "pipeline" } : {};

  if (total > 0 && page > 1 && orders.length === 0) {
    redirect(buildPageHref("/sales", pageCount(total), query));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pipelineOnly ? (
              <>
                Created, not yet invoiced.{" "}
                <Link href="/sales" className="text-accent hover:underline">
                  Show all orders
                </Link>
              </>
            ) : (
              "Orders, invoices and payments."
            )}
          </p>
        </div>
        <NewOrderDialog
          kind="sale"
          partners={customers}
          products={products}
          taxes={taxes}
          analyticAccounts={analyticAccounts}
          partnerLabel="Customer"
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Billing</TableHead>
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
              <TableCell>
                <StatusBadge value={o.invoice_status} />
              </TableCell>
              <TableCell className="tabular text-right font-mono">
                {formatMoney(o.amount_total)}
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {pipelineOnly ? "Nothing in the pipeline — everything's invoiced." : "No sales orders yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/sales" query={query} />
    </div>
  );
}
