import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  draft: "text-muted-foreground border-border",
  sent: "text-muted-foreground border-border",
  sale: "text-success border-success",
  purchase: "text-success border-success",
  done: "text-success border-success",
  posted: "text-success border-success",
  paid: "text-success border-success",
  in_payment: "text-success border-success",
  not_paid: "text-destructive border-destructive",
  partial: "text-accent border-accent",
  cancel: "text-destructive border-destructive",
  // sale.order/purchase.order invoice_status — a *separate* lifecycle from
  // the order's own state above: "Sale"/"Purchase" only means the order was
  // confirmed, never that it's been billed or paid.
  no: "text-muted-foreground border-border",
  "to invoice": "text-accent border-accent",
  invoiced: "text-success border-success",
  upselling: "text-success border-success",
};

// Overrides for values whose raw Odoo wording reads oddly as a bare badge
// ("to invoice" with no subject) or would just repeat the order's own
// Status badge sitting right next to it ("no" only ever means "still
// draft" in this app's flow — the Status column already says that).
const LABEL: Record<string, string> = {
  no: "—",
  "to invoice": "To invoice",
  upselling: "Invoiced",
};

export function StatusBadge({ value }: { value: string }) {
  // A placeholder, not a status — no box around a bare dash.
  if (value === "no") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-xs capitalize",
        TONE[value] ?? "text-muted-foreground border-border",
      )}
    >
      {LABEL[value] ?? value.replace(/_/g, " ")}
    </span>
  );
}
