import { callKw, searchRead } from "./client";
import type { Budget, DashboardSummary } from "./types";

interface Aggregate {
  amount_residual?: number;
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
  const [receivable, payable, openSalesOrders, openPurchaseOrders, budgets] = await Promise.all([
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
    callKw<number>("sale.order", "search_count", [[["state", "=", "sale"]]]),
    callKw<number>("purchase.order", "search_count", [[["state", "=", "purchase"]]]),
    searchRead<Budget>("ufa.budget", [], ["name", "planned_amount", "actual_amount"], { limit: 8 }),
  ]);

  return {
    outstandingReceivable: receivable[0]?.amount_residual ?? 0,
    outstandingPayable: payable[0]?.amount_residual ?? 0,
    openSalesOrders,
    openPurchaseOrders,
    budgets: budgets.map((b) => ({
      name: b.name,
      planned_amount: b.planned_amount,
      actual_amount: b.actual_amount,
    })),
    // Demo data is entirely India-based (see docs/TESTING_GUIDE.md); the
    // company currency is INR for this deployment.
    currencySymbol: "₹",
  };
}
