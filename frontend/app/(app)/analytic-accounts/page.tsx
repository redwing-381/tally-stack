import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { AnalyticAccount } from "@/lib/odoo/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AnalyticAccountFormDialog } from "@/components/analytic/AnalyticAccountFormDialog";

export default async function AnalyticAccountsPage(props: PageProps<"/analytic-accounts">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  const [accounts, total, plans] = await Promise.all([
    searchRead<AnalyticAccount>(
      "account.analytic.account",
      [],
      ["name", "ufa_type", "plan_id"],
      { order: "name", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("account.analytic.account"),
    searchRead<{ id: number; name: string }>("account.analytic.plan", [], ["name"], { order: "name" }),
  ]);

  if (total > 0 && page > 1 && accounts.length === 0) {
    redirect(buildPageHref("/analytic-accounts", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Analytic accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Markers that group income and spend by project or department.
          </p>
        </div>
        <AnalyticAccountFormDialog
          plans={plans}
          trigger={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={15} /> New analytic account
            </Button>
          }
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>
                {a.ufa_type ? (
                  <Badge variant="outline">{a.ufa_type === "income" ? "Income" : "Expenses"}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.plan_id ? a.plan_id[1] : "—"}
              </TableCell>
              <TableCell className="text-right">
                <AnalyticAccountFormDialog
                  account={a}
                  plans={plans}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>}
                />
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                No analytic accounts yet. Add one to budget against it.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/analytic-accounts" />
    </div>
  );
}
