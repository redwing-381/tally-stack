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
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-xs capitalize",
        TONE[value] ?? "text-muted-foreground border-border",
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
