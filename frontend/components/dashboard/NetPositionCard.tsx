import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

/**
 * The one number that answers "are we in the black right now" — receivable
 * minus payable. Given hero treatment (bigger type, its own row) because on
 * an accounting dashboard this is genuinely the most load-bearing fact, not
 * a default we reached for — everything else on the page is a component of
 * or a detail on top of this one figure.
 */
export function NetPositionCard({
  netPosition,
  receivable,
  payable,
  currencySymbol,
}: {
  netPosition: number;
  receivable: number;
  payable: number;
  currencySymbol: string;
}) {
  const positive = netPosition >= 0;

  return (
    <div className="border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Net position</p>
      <p
        className={cn(
          "tabular mt-2 font-mono text-4xl",
          positive ? "text-success" : "text-destructive",
        )}
      >
        {positive ? "" : "−"}
        {formatMoney(Math.abs(netPosition), currencySymbol)}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="text-foreground">{formatMoney(receivable, currencySymbol)}</span> receivable
        {" − "}
        <span className="text-foreground">{formatMoney(payable, currencySymbol)}</span> payable
      </p>
    </div>
  );
}
