import { getDashboardSummary } from "@/lib/odoo/queries";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { NetPositionCard } from "@/components/dashboard/NetPositionCard";
import { OutstandingInvoices } from "@/components/dashboard/OutstandingInvoices";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LiveRefresher } from "@/components/dashboard/LiveRefresher";
import { BudgetChart } from "@/components/charts/BudgetChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where the business stands today.
          </p>
        </div>
        <LiveRefresher />
      </div>

      {/* The one fact that matters most gets its own row — everything below
          is a component of, or a detail on top of, this number. */}
      <div className="mt-8">
        <NetPositionCard
          netPosition={summary.netPosition}
          receivable={summary.outstandingReceivable}
          payable={summary.outstandingPayable}
          currencySymbol={summary.currencySymbol}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Outstanding receivable"
          value={formatMoney(summary.outstandingReceivable, summary.currencySymbol)}
        />
        <KpiCard
          label="Overdue receivable"
          value={formatMoney(summary.overdueReceivable, summary.currencySymbol)}
          tone={summary.overdueReceivable > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Outstanding payable"
          value={formatMoney(summary.outstandingPayable, summary.currencySymbol)}
          tone="warn"
          href="/purchases/outstanding"
        />
        <KpiCard
          label="Profit this month"
          value={formatMoney(summary.monthProfit, summary.currencySymbol)}
          tone={summary.monthProfit >= 0 ? "good" : "warn"}
        />
      </div>

      {/* Deliberately its own labeled row, not folded into the KPIs above:
          an order alone never touches receivable/payable — nothing's owed
          until it's actually invoiced — so this is the one place that moves
          the instant a sale or purchase order is created, and it's labeled
          to make that distinction obvious rather than confusing. */}
      <div className="mt-6">
        <p className="text-xs text-muted-foreground">In the pipeline — created, not yet invoiced</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Sales pipeline"
            value={formatMoney(summary.salesPipeline.value, summary.currencySymbol)}
            detail={`${summary.salesPipeline.count} order${summary.salesPipeline.count === 1 ? "" : "s"}`}
            href="/sales?status=pipeline"
          />
          <KpiCard
            label="Purchase pipeline"
            value={formatMoney(summary.purchasePipeline.value, summary.currencySymbol)}
            detail={`${summary.purchasePipeline.count} order${summary.purchasePipeline.count === 1 ? "" : "s"}`}
            href="/purchases?status=pipeline"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-border bg-card p-6">
          <h2 className="font-heading text-lg">Sales vs. purchases — last 6 months</h2>
          <div className="mt-4">
            <TrendChart data={summary.monthlyTrend} currencySymbol={summary.currencySymbol} />
          </div>
        </div>
        <div className="border border-border bg-card p-6">
          <h2 className="font-heading text-lg">Budgets — planned vs. actual</h2>
          <div className="mt-4">
            <BudgetChart data={summary.budgets} currencySymbol={summary.currencySymbol} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-border bg-card p-6">
          <h2 className="font-heading text-lg">Who owes the most</h2>
          <div className="mt-2">
            <OutstandingInvoices rows={summary.topOutstanding} currencySymbol={summary.currencySymbol} />
          </div>
        </div>
        <div className="border border-border bg-card p-6">
          <h2 className="font-heading text-lg">Recent activity</h2>
          <div className="mt-2">
            <RecentActivity rows={summary.recentActivity} currencySymbol={summary.currencySymbol} />
          </div>
        </div>
      </div>
    </div>
  );
}
