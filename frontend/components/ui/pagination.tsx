import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, buildPageHref, pageCount } from "@/lib/pagination";

const STEP = "inline-flex items-center gap-1 border border-border px-3 py-1.5 text-sm";

/**
 * Footer for the paginated list pages. Link-based (no client JS) so it
 * works as a plain server component — each page is its own URL, which
 * keeps back/forward and refresh behaving the way people expect.
 */
export function Pagination({
  page,
  total,
  basePath,
  query = {},
}: {
  page: number;
  total: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (total === 0) return null;

  const pages = pageCount(total);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        <span className="tabular font-mono">
          {first}–{last}
        </span>{" "}
        of <span className="tabular font-mono">{total}</span>
      </p>

      {pages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={buildPageHref(basePath, page - 1, query)} className={cn(STEP, "bg-card hover:bg-secondary")}>
              <ChevronLeft size={14} /> Previous
            </Link>
          ) : (
            <span className={cn(STEP, "text-muted-foreground/40")} aria-disabled="true">
              <ChevronLeft size={14} /> Previous
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Page <span className="tabular font-mono">{page}</span> of{" "}
            <span className="tabular font-mono">{pages}</span>
          </span>

          {page < pages ? (
            <Link href={buildPageHref(basePath, page + 1, query)} className={cn(STEP, "bg-card hover:bg-secondary")}>
              Next <ChevronRight size={14} />
            </Link>
          ) : (
            <span className={cn(STEP, "text-muted-foreground/40")} aria-disabled="true">
              Next <ChevronRight size={14} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
