import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { callKw } from "@/lib/odoo/client";
import type { JournalEntry, JournalItem } from "@/lib/odoo/types";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { formatMoney, formatDate } from "@/lib/format";

export default async function JournalEntryDetailPage(props: PageProps<"/journal-entries/[id]">) {
  const { id } = await props.params;
  const entryId = Number(id);

  const [entry] = await callKw<JournalEntry[]>("account.move", "read", [
    [entryId],
    ["name", "date", "ref", "journal_id", "state"],
  ]);
  if (!entry) notFound();

  const items = await callKw<JournalItem[]>("account.move.line", "search_read", [
    [["move_id", "=", entryId]],
    ["name", "account_id", "partner_id", "debit", "credit"],
  ]);

  const totalDebit = items.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = items.reduce((sum, l) => sum + l.credit, 0);
  // Posted entries are balanced by construction — Odoo refuses to post
  // otherwise — so this only ever flags a draft that isn't finished yet.
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="p-10">
      <Link
        href="/journal-entries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={14} /> Journal entries
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">{entry.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entry.journal_id ? entry.journal_id[1] : "—"} · {formatDate(entry.date)}
            {entry.ref ? ` · ${entry.ref}` : ""}
          </p>
        </div>
        <StatusBadge value={entry.state} />
      </div>

      <div className="mt-8 border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-normal">Account</th>
              <th className="px-4 py-3 font-normal">Label</th>
              <th className="px-4 py-3 font-normal">Contact</th>
              <th className="px-4 py-3 text-right font-normal">Debit</th>
              <th className="px-4 py-3 text-right font-normal">Credit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{l.account_id ? l.account_id[1] : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {l.partner_id ? l.partner_id[1] : "—"}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono">
                  {l.debit ? formatMoney(l.debit) : ""}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono">
                  {l.credit ? formatMoney(l.credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rule-total">
              <td colSpan={3} className="px-4 py-3 text-right font-medium">
                Total
              </td>
              <td className="tabular px-4 py-3 text-right font-mono font-medium">
                {formatMoney(totalDebit)}
              </td>
              <td className="tabular px-4 py-3 text-right font-mono font-medium">
                {formatMoney(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!balanced && (
        <p className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">
          Debits and credits differ by {formatMoney(Math.abs(totalDebit - totalCredit))}. This entry
          can&apos;t be posted until they match.
        </p>
      )}
    </div>
  );
}
