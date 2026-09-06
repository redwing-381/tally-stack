import Link from "next/link";
import { formatMoney, timeAgo } from "@/lib/format";

interface Row {
  key: string;
  type: "sale" | "purchase" | "invoice" | "bill" | "payment";
  label: string;
  name: string;
  partnerName: string;
  amount: number;
  date: string;
  href: string | null;
}

/**
 * The direct answer to "I created something, why doesn't the dashboard show
 * it" — this is the one section that reflects *every* action the instant
 * it happens, including the ones (orders) that deliberately don't move any
 * of the accounting totals above, because nothing's been invoiced yet.
 */
export function RecentActivity({ rows, currencySymbol }: { rows: Row[]; currencySymbol: string }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        const content = (
          <>
            <div>
              <p className="text-sm font-medium">
                {row.label} · <span className="font-mono">{row.name}</span>
              </p>
              <p className="text-xs text-muted-foreground">{row.partnerName}</p>
            </div>
            <div className="text-right">
              <p className="tabular font-mono text-sm">{formatMoney(row.amount, currencySymbol)}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(row.date)}</p>
            </div>
          </>
        );
        return row.href ? (
          <Link
            key={row.key}
            href={row.href}
            className="flex items-center justify-between gap-4 py-3 hover:bg-secondary/40"
          >
            {content}
          </Link>
        ) : (
          <div key={row.key} className="flex items-center justify-between gap-4 py-3">
            {content}
          </div>
        );
      })}
    </div>
  );
}
