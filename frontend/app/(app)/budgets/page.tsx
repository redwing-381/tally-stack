import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { Budget } from "@/lib/odoo/types";
import { PERSONA_COOKIE } from "@/lib/odoo/session";
import { Button } from "@/components/ui/button";
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
import { BudgetFormDialog } from "@/components/budgets/BudgetFormDialog";
import { DeleteBudgetButton } from "@/components/budgets/DeleteBudgetButton";
import { BudgetChart } from "@/components/charts/BudgetChart";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function BudgetsPage(props: PageProps<"/budgets">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  const [budgets, total, analyticAccounts, users, jar] = await Promise.all([
    // Ordered by period_start (a stored column). actual_amount/variance are
    // computed and non-stored, so they can't be sorted or offset on in SQL.
    searchRead<Budget>(
      "ufa.budget",
      [],
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
      { order: "period_start desc", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("ufa.budget"),
    searchRead<{ id: number; name: string }>("account.analytic.account", [], ["name"], { order: "name" }),
    // Internal users only — a portal contact can't be accountable for a budget.
    searchRead<{ id: number; name: string }>("res.users", [["share", "=", false]], ["name"], {
      order: "name",
    }),
    cookies(),
  ]);

  if (total > 0 && page > 1 && budgets.length === 0) {
    redirect(buildPageHref("/budgets", pageCount(total)));
  }

  // ir.model.access.csv gives Invoicing Users no unlink rights on ufa.budget
  // (perm_unlink=0) — hide the button rather than let it 403 on click.
  const canDelete = jar.get(PERSONA_COOKIE)?.value === "admin";

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Planned vs. actual, by analytic account.</p>
        </div>
        <BudgetFormDialog
          analyticAccounts={analyticAccounts}
          users={users}
          trigger={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={15} /> New budget
            </Button>
          }
        />
      </div>

      {/* Charts the page you're looking at, so it stays readable and stays
          in step with the table below rather than cramming every budget in. */}
      <div className="mt-6 shrink-0 border border-border bg-card p-6">
        <BudgetChart
          data={budgets.map((b) => ({ name: b.name, planned_amount: b.planned_amount, actual_amount: b.actual_amount }))}
          currencySymbol="₹"
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Analytic account</TableHead>
            <TableHead>Responsible</TableHead>
            <TableHead className="text-right">Planned</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(b.period_start)} – {formatDate(b.period_end)}
              </TableCell>
              <TableCell>{b.analytic_account_id ? b.analytic_account_id[1] : "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {b.responsible_user_id ? b.responsible_user_id[1] : "—"}
              </TableCell>
              <TableCell className="tabular text-right font-mono">{formatMoney(b.planned_amount)}</TableCell>
              <TableCell className="tabular text-right font-mono">{formatMoney(b.actual_amount)}</TableCell>
              <TableCell
                className={cn(
                  "tabular text-right font-mono",
                  b.variance < 0 ? "text-destructive" : "text-success",
                )}
              >
                {formatMoney(b.variance)}
              </TableCell>
              <TableCell className="flex items-center justify-end gap-3">
                <BudgetFormDialog
                  budget={b}
                  analyticAccounts={analyticAccounts}
                  users={users}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>}
                />
                {canDelete && <DeleteBudgetButton id={b.id} />}
              </TableCell>
            </TableRow>
          ))}
          {budgets.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No budgets yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/budgets" />
    </div>
  );
}
