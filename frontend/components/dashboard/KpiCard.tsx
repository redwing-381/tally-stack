import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  tone = "default",
  detail,
  href,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "good";
  detail?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {href && (
          <ArrowRight
            size={14}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>
      <p
        className={cn(
          "tabular mt-3 whitespace-nowrap font-mono text-2xl",
          tone === "warn" && "text-destructive",
          tone === "good" && "text-success",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block border border-border bg-card p-6 transition-colors hover:border-accent"
      >
        {content}
      </Link>
    );
  }

  return <div className="border border-border bg-card p-6">{content}</div>;
}
