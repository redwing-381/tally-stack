import Link from "next/link";
import { redirect } from "next/navigation";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { JournalEntry } from "@/lib/odoo/types";
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
import { formatDate } from "@/lib/format";

export default async function JournalEntriesPage(props: PageProps<"/journal-entries">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  // Every account.move, not just move_type 'entry': an invoice *is* a
  // journal entry, and seeing the invoices and bills here alongside manual
  // entries is what shows the double-entry ledger behind the whole system.
  const [entries, total] = await Promise.all([
    searchRead<JournalEntry>(
      "account.move",
      [],
      ["name", "date", "ref", "journal_id", "state"],
      { order: "date desc, id desc", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("account.move"),
  ]);

  if (total > 0 && page > 1 && entries.length === 0) {
    redirect(buildPageHref("/journal-entries", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="shrink-0">
        <h1 className="font-heading text-2xl">Journal entries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The double-entry record behind every transaction.
        </p>
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Entry</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Journal</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Link href={`/journal-entries/${e.id}`} className="font-medium hover:text-accent">
                  {e.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(e.date)}</TableCell>
              <TableCell>{e.journal_id ? e.journal_id[1] : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{e.ref || "—"}</TableCell>
              <TableCell>
                <StatusBadge value={e.state} />
              </TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No journal entries yet. They appear as you record sales and purchases.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/journal-entries" />
    </div>
  );
}
