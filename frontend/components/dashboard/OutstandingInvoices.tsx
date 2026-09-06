import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Row {
  id: number;
  name: string;
  partnerName: string;
  amountResidual: number;
  dueDate: string | false;
}

function isOverdue(dueDate: string | false): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

/**
 * Who owes the most, front and center — an aggregate number tells you the
 * total is large, this tells you who to actually chase.
 */
export function OutstandingInvoices({ rows, currencySymbol }: { rows: Row[]; currencySymbol: string }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing outstanding — all caught up.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((inv) => {
        const overdue = isOverdue(inv.dueDate);
        return (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-center justify-between gap-4 py-3 hover:bg-secondary/40"
          >
            <div>
              <p className="text-sm font-medium">{inv.name}</p>
              <p className="text-xs text-muted-foreground">{inv.partnerName}</p>
            </div>
            <div className="text-right">
              <p className="tabular font-mono text-sm">{formatMoney(inv.amountResidual, currencySymbol)}</p>
              <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : "No due date"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
