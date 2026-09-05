import { searchRead } from "@/lib/odoo/client";
import type { Budget } from "@/lib/odoo/types";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function param(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? "";
}

export default async function BudgetReportPage(props: PageProps<"/reports/budget">) {
  const searchParams = await props.searchParams;
  const from = param(searchParams.from);
  const to = param(searchParams.to);

  // A budget belongs in the report when its period overlaps the selected
  // window — not only when it sits entirely inside it, which would hide a
  // quarterly budget from a one-month view.
  const domain: unknown[] = [];
  if (to) domain.push(["period_start", "<=", to]);
  if (from) domain.push(["period_end", ">=", from]);

  const budgets = await searchRead<Budget>(
    "ufa.budget",
    domain,
    [
      "name",
      "period_start",
      "period_end",
      "analytic_account_id",
      "responsible_user_id",
      "planned_amount",
      "actual_amount",
      "variance",
    ],
    { order: "period_start desc" },
  );

  const totals = budgets.reduce(
    (acc, b) => ({
      planned: acc.planned + b.planned_amount,
      actual: acc.actual + b.actual_amount,
      variance: acc.variance + b.variance,
    }),
    { planned: 0, actual: 0, variance: 0 },
  );

  return (
    <div className="p-10">
      <h1 className="font-heading text-2xl">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Planned spend against what actually landed, for the period you choose.
      </p>

      <div className="mt-6">
        <ReportTabs />
      </div>

      {/* Plain GET form: the period lives in the URL, so a report view can be
          bookmarked and shared, and it needs no client-side JavaScript. */}
      <form className="mt-8 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} className="w-44" />
        </div>
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
          Apply period
        </Button>
        {(from || to) && (
          <a href="/reports/budget" className="text-sm text-muted-foreground hover:text-foreground">
            Clear
          </a>
        )}
      </form>

      <div className="mt-8 border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-normal">Budget</th>
              <th className="px-4 py-3 font-normal">Period</th>
              <th className="px-4 py-3 font-normal">Analytic account</th>
              <th className="px-4 py-3 font-normal">Responsible</th>
              <th className="px-4 py-3 text-right font-normal">Planned</th>
              <th className="px-4 py-3 text-right font-normal">Actual</th>
              <th className="px-4 py-3 text-right font-normal">Variance</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(b.period_start)} – {formatDate(b.period_end)}
                </td>
                <td className="px-4 py-3">
                  {b.analytic_account_id ? b.analytic_account_id[1] : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.responsible_user_id ? b.responsible_user_id[1] : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono">
                  {formatMoney(b.planned_amount)}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono">
                  {formatMoney(b.actual_amount)}
                </td>
                <td
                  className={cn(
                    "tabular px-4 py-3 text-right font-mono",
                    b.variance < 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {formatMoney(b.variance)}
                </td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No budgets fall in this period. Widen the dates, or add a budget.
                </td>
              </tr>
            )}
          </tbody>
          {budgets.length > 0 && (
            <tfoot>
              <tr className="rule-total">
                <td colSpan={4} className="px-4 py-3 text-right font-medium">
                  Total
                </td>
                <td className="tabular px-4 py-3 text-right font-mono font-medium">
                  {formatMoney(totals.planned)}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono font-medium">
                  {formatMoney(totals.actual)}
                </td>
                <td
                  className={cn(
                    "tabular px-4 py-3 text-right font-mono font-medium",
                    totals.variance < 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {formatMoney(totals.variance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
