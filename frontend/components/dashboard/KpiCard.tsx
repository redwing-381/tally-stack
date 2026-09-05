import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-3 font-mono text-3xl",
          tone === "warn" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
