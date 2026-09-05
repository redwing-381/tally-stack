import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { Account } from "@/lib/odoo/types";
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
import { AccountFormDialog } from "@/components/accounts/AccountFormDialog";
import { accountTypeLabel, accountFamily } from "@/lib/accounting";

export default async function AccountsPage(props: PageProps<"/accounts">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  const [accounts, total] = await Promise.all([
    searchRead<Account>(
      "account.account",
      [],
      ["name", "code", "account_type", "reconcile"],
      { order: "code", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("account.account"),
  ]);

  if (total > 0 && page > 1 && accounts.length === 0) {
    redirect(buildPageHref("/accounts", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Chart of accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every ledger account transactions get classified into.
          </p>
        </div>
        <AccountFormDialog
          trigger={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={15} /> New account
            </Button>
          }
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="tabular font-mono text-muted-foreground">{a.code}</TableCell>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{accountFamily(a.account_type)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {accountTypeLabel(a.account_type)}
              </TableCell>
              <TableCell className="text-right">
                <AccountFormDialog
                  account={a}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>}
                />
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No accounts yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/accounts" />
    </div>
  );
}
