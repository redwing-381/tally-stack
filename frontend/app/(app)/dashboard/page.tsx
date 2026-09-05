import { getDashboardSummary } from "@/lib/odoo/queries";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BudgetChart } from "@/components/charts/BudgetChart";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="p-10">
      <h1 className="font-heading text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Where the business stands today.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Outstanding receivable"
          value={formatMoney(summary.outstandingReceivable, summary.currencySymbol)}
        />
        <KpiCard
          label="Outstanding payable"
          value={formatMoney(summary.outstandingPayable, summary.currencySymbol)}
          tone="warn"
        />
        <KpiCard label="Open sales orders" value={String(summary.openSalesOrders)} />
        <KpiCard label="Open purchase orders" value={String(summary.openPurchaseOrders)} />
      </div>

      <div className="mt-8 border border-border bg-card p-6">
        <h2 className="font-heading text-lg">Budgets — planned vs. actual</h2>
        <div className="mt-4">
          <BudgetChart data={summary.budgets} currencySymbol={summary.currencySymbol} />
        </div>
      </div>
    </div>
  );
}
