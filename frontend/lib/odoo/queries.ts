import { callKw, searchRead } from "./client";
import { generateReport } from "./actions";
import { istNow, istDateIso } from "./date";
import type { Budget, DashboardSummary } from "./types";

interface Aggregate {
  amount_residual?: number;
}

interface CountedAggregate {
  amount_total?: number | false;
  __count?: number;
}

/**
 * Odoo's read_group returns `false` (not 0 or omitted) for a Monetary sum
 * when zero records match — not `null`/`undefined`, so `?? 0` alone lets it
 * through unchanged and it ends up template-literaled into the UI as the
 * string "false". `Number(false)` is `0`, so this coerces every falsy shape
 * (false, null, undefined) to a real zero.
 */
function sumOrZero(value: number | false | undefined): number {
  return Number(value) || 0;
}

/**
 * Odoo's read_group labels a `:month` groupby as "September 2026" (locale
 * full month name + year) — confirmed against the live container rather
 * than assumed, since this is exactly the kind of formatting that varies
 * across Odoo versions. Building the same string locally is what lets the
 * last-6-months scaffold below merge with whatever groups Odoo returns.
 */
// These read UTC-constructed dates (see istDateIso/istNow below), so
// formatting is pinned to UTC too — otherwise the container's own local
// timezone setting would reinterpret the components when displaying them.
function odooMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function shortMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

/**
 * Our own furniture catalogue only. Filtering by invoice_policy /
 * purchase_method alone let system products through (Odoo's "Deposit",
 * meant only for internal down-payment invoicing, shares the same policy) —
 * found live when a demo order was created against it by mistake.
 *
 * This used to resolve the catalogue through ir.model.data, which only
 * administrators may read, so the order screens 500'd for the Invoicing
 * User. The `ufa_is_catalog` flag on product.template carries the same
 * meaning and is readable by anyone who can read products.
 */
export async function getCatalogProducts(): Promise<Array<{ id: number; name: string }>> {
  return searchRead<{ id: number; name: string }>(
    "product.product",
    [["ufa_is_catalog", "=", true]],
    ["name"],
    { order: "name" },
  );
}

/**
 * Aggregates the Dashboard's KPI data with parallel read_group/search_count
 * calls — no new Odoo controller needed, everything here is already
 * readable via the generic ORM API. Called directly from the Dashboard
 * Server Component (no self-hosted HTTP hop); the /api/dashboard/summary
 * route wraps the same function for any future client-side polling.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // IST, not raw server UTC — see lib/odoo/date.ts for why: Odoo computes
  // a posted entry's own date in the logged-in user's timezone (India for
  // everyone here), and a UTC "today" falls a day behind that for part of
  // every day, silently dropping recent activity out of "this month".
  const today = istNow();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth();
  const todayDay = today.getUTCDate();

  // First day of the month 5 months ago -> a clean 6-month window ending
  // this month, e.g. viewed in September that's [April 1, today).
  const trendStartIso = istDateIso(todayYear, todayMonth - 5, 1);
  const monthStartIso = istDateIso(todayYear, todayMonth, 1);
  const todayIso = istDateIso(todayYear, todayMonth, todayDay);

  const [
    receivable,
    payable,
    overdue,
    openSalesOrders,
    openPurchaseOrders,
    salesPipelineRaw,
    purchasePipelineRaw,
    budgets,
    monthlyReport,
    salesByMonth,
    purchasesByMonth,
    topOutstandingRaw,
    recentSales,
    recentPurchases,
    recentInvoices,
    recentPayments,
  ] = await Promise.all([
    callKw<Aggregate[]>("account.move", "read_group", [
      [
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
        ["payment_state", "not in", ["paid", "reversed"]],
      ],
      ["amount_residual:sum"],
      [],
    ]),
    callKw<Aggregate[]>("account.move", "read_group", [
      [
        ["move_type", "=", "in_invoice"],
        ["state", "=", "posted"],
        ["payment_state", "not in", ["paid", "reversed"]],
      ],
      ["amount_residual:sum"],
      [],
    ]),
    callKw<Aggregate[]>("account.move", "read_group", [
      [
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
        ["payment_state", "not in", ["paid", "reversed"]],
        ["invoice_date_due", "<", todayIso],
      ],
      ["amount_residual:sum"],
      [],
    ]),
    callKw<number>("sale.order", "search_count", [[["state", "=", "sale"]]]),
    callKw<number>("purchase.order", "search_count", [[["state", "=", "purchase"]]]),
    // "Pipeline" = orders that exist but haven't been billed yet, at any
    // stage from draft onward. This is what actually moves the instant a
    // sale/purchase order is created — outstandingReceivable/Payable can't,
    // by design, since nothing has hit the books until there's a posted
    // invoice or bill. Without this, creating an order looks like it did
    // nothing at all.
    callKw<CountedAggregate[]>("sale.order", "read_group", [
      [
        ["state", "!=", "cancel"],
        ["invoice_status", "!=", "invoiced"],
      ],
      ["amount_total:sum"],
      [],
    ]),
    callKw<CountedAggregate[]>("purchase.order", "read_group", [
      [
        ["state", "!=", "cancel"],
        ["invoice_status", "!=", "invoiced"],
      ],
      ["amount_total:sum"],
      [],
    ]),
    searchRead<Budget>("ufa.budget", [], ["name", "planned_amount", "actual_amount"], { limit: 8 }),
    // Reuses the same wizard the Reports screen drives, rather than
    // re-deriving Odoo's credit/debit sign flip for income vs expense
    // accounts here — ufa.financial.report.wizard is a TransientModel, so
    // Odoo garbage-collects these rows on its own.
    generateReport(null, "profit_loss", todayIso, monthStartIso),
    callKw<Array<{ "invoice_date:month": string; amount_total?: number | false }>>(
      "account.move",
      "read_group",
      [
        [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["invoice_date", ">=", trendStartIso],
        ],
        ["amount_total:sum"],
        ["invoice_date:month"],
      ],
    ),
    callKw<Array<{ "invoice_date:month": string; amount_total?: number | false }>>(
      "account.move",
      "read_group",
      [
        [
          ["move_type", "=", "in_invoice"],
          ["state", "=", "posted"],
          ["invoice_date", ">=", trendStartIso],
        ],
        ["amount_total:sum"],
        ["invoice_date:month"],
      ],
    ),
    searchRead<{
      id: number;
      name: string;
      partner_id: [number, string] | false;
      amount_residual: number;
      invoice_date_due: string | false;
    }>(
      "account.move",
      [
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
        ["payment_state", "not in", ["paid", "reversed"]],
      ],
      ["name", "partner_id", "amount_residual", "invoice_date_due"],
      { order: "amount_residual desc", limit: 5 },
    ),
    // Recent activity merges four models by create_date so "I just did
    // something" shows up immediately, regardless of whether that action
    // was an order (which doesn't touch the books) or a payment (which
    // does) — this is the direct answer to "why doesn't creating an order
    // show up anywhere."
    searchRead<{ id: number; name: string; partner_id: [number, string] | false; amount_total: number; create_date: string }>(
      "sale.order",
      [],
      ["name", "partner_id", "amount_total", "create_date"],
      { order: "create_date desc", limit: 5 },
    ),
    searchRead<{ id: number; name: string; partner_id: [number, string] | false; amount_total: number; create_date: string }>(
      "purchase.order",
      [],
      ["name", "partner_id", "amount_total", "create_date"],
      { order: "create_date desc", limit: 5 },
    ),
    searchRead<{
      id: number;
      name: string;
      partner_id: [number, string] | false;
      amount_total: number;
      move_type: string;
      create_date: string;
    }>(
      "account.move",
      [
        ["move_type", "in", ["out_invoice", "in_invoice"]],
        ["state", "=", "posted"],
      ],
      ["name", "partner_id", "amount_total", "move_type", "create_date"],
      { order: "create_date desc", limit: 5 },
    ),
    searchRead<{
      id: number;
      name: string;
      partner_id: [number, string] | false;
      amount: number;
      payment_type: string;
      create_date: string;
    }>(
      "account.payment",
      [["state", "=", "posted"]],
      ["name", "partner_id", "amount", "payment_type", "create_date"],
      { order: "create_date desc", limit: 5 },
    ),
  ]);

  const outstandingReceivable = sumOrZero(receivable[0]?.amount_residual);
  const outstandingPayable = sumOrZero(payable[0]?.amount_residual);
  const overdueReceivable = sumOrZero(overdue[0]?.amount_residual);
  const salesPipeline = {
    value: sumOrZero(salesPipelineRaw[0]?.amount_total),
    count: salesPipelineRaw[0]?.__count ?? 0,
  };
  const purchasePipeline = {
    value: sumOrZero(purchasePipelineRaw[0]?.amount_total),
    count: purchasePipelineRaw[0]?.__count ?? 0,
  };

  const recentActivity = [
    ...recentSales.map((o) => ({
      key: `sale-${o.id}`,
      type: "sale" as const,
      label: "Sales order",
      name: o.name,
      partnerName: o.partner_id ? o.partner_id[1] : "—",
      amount: o.amount_total,
      date: o.create_date,
      href: `/sales/${o.id}`,
    })),
    ...recentPurchases.map((o) => ({
      key: `purchase-${o.id}`,
      type: "purchase" as const,
      label: "Purchase order",
      name: o.name,
      partnerName: o.partner_id ? o.partner_id[1] : "—",
      amount: o.amount_total,
      date: o.create_date,
      href: `/purchases/${o.id}`,
    })),
    ...recentInvoices.map((m) => {
      const isInvoice = m.move_type === "out_invoice";
      return {
        key: `move-${m.id}`,
        type: isInvoice ? ("invoice" as const) : ("bill" as const),
        label: isInvoice ? "Invoice posted" : "Bill posted",
        name: m.name,
        partnerName: m.partner_id ? m.partner_id[1] : "—",
        amount: m.amount_total,
        date: m.create_date,
        href: `/invoices/${m.id}`,
      };
    }),
    ...recentPayments.map((p) => ({
      key: `payment-${p.id}`,
      type: "payment" as const,
      label: p.payment_type === "inbound" ? "Payment received" : "Payment sent",
      name: p.name,
      partnerName: p.partner_id ? p.partner_id[1] : "—",
      amount: p.amount,
      date: p.create_date,
      href: null,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const salesByLabel = new Map(salesByMonth.map((r) => [r["invoice_date:month"], sumOrZero(r.amount_total)]));
  const purchasesByLabel = new Map(
    purchasesByMonth.map((r) => [r["invoice_date:month"], sumOrZero(r.amount_total)]),
  );
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    // UTC-constructed from the already-extracted IST y/m, not
    // today.getMonth() again — that uses the JS runtime's local timezone,
    // which only happens to agree with IST math here because this
    // container's own clock is set to UTC.
    const d = new Date(Date.UTC(todayYear, todayMonth - 5 + i, 1));
    const odooLabel = odooMonthLabel(d);
    return {
      month: shortMonthLabel(d),
      sales: salesByLabel.get(odooLabel) ?? 0,
      purchases: purchasesByLabel.get(odooLabel) ?? 0,
    };
  });

  return {
    outstandingReceivable,
    overdueReceivable,
    outstandingPayable,
    netPosition: outstandingReceivable - outstandingPayable,
    monthProfit: monthlyReport.netResult,
    openSalesOrders,
    openPurchaseOrders,
    salesPipeline,
    purchasePipeline,
    budgets: budgets.map((b) => ({
      name: b.name,
      planned_amount: b.planned_amount,
      actual_amount: b.actual_amount,
    })),
    monthlyTrend,
    topOutstanding: topOutstandingRaw.map((inv) => ({
      id: inv.id,
      name: inv.name,
      partnerName: inv.partner_id ? inv.partner_id[1] : "—",
      amountResidual: inv.amount_residual,
      dueDate: inv.invoice_date_due,
    })),
    recentActivity,
    // Demo data is entirely India-based (see docs/TESTING_GUIDE.md); the
    // company currency is INR for this deployment.
    currencySymbol: "₹",
  };
}
