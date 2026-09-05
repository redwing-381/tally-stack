import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { Journal } from "@/lib/odoo/types";
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
import { JournalFormDialog } from "@/components/journals/JournalFormDialog";
import { journalTypeLabel } from "@/lib/accounting";

export default async function JournalsPage(props: PageProps<"/journals">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  const [journals, total, accounts] = await Promise.all([
    searchRead<Journal>(
      "account.journal",
      [],
      ["name", "code", "type", "default_account_id"],
      { order: "type, name", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("account.journal"),
    searchRead<{ id: number; name: string; code: string }>("account.account", [], ["name", "code"], {
      order: "code",
    }),
  ]);

  if (total > 0 && page > 1 && journals.length === 0) {
    redirect(buildPageHref("/journals", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Journals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How transactions are grouped — sales, purchases, bank and cash.
          </p>
        </div>
        <JournalFormDialog
          accounts={accounts}
          trigger={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={15} /> New journal
            </Button>
          }
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Journal</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Default account</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {journals.map((j) => (
            <TableRow key={j.id}>
              <TableCell className="tabular font-mono text-muted-foreground">{j.code}</TableCell>
              <TableCell className="font-medium">{j.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{journalTypeLabel(j.type)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {j.default_account_id ? j.default_account_id[1] : "—"}
              </TableCell>
              <TableCell className="text-right">
                <JournalFormDialog
                  journal={j}
                  accounts={accounts}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>}
                />
              </TableCell>
            </TableRow>
          ))}
          {journals.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No journals yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/journals" />
    </div>
  );
}
