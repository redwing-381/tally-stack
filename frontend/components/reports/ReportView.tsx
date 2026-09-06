"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateReport } from "@/lib/odoo/actions";
import { formatMoney, formatDate } from "@/lib/format";
import { istNow, istDateIso, istTodayIso } from "@/lib/odoo/date";
import { ReportSummaryChart } from "@/components/charts/ReportSummaryChart";
import { DownloadPdfButton } from "@/components/reports/DownloadPdfButton";
import type { ReportSection } from "@/lib/odoo/types";

const SECTION_LABELS: Record<ReportSection, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Capital",
  income: "Income",
  expense: "Expenses",
};

interface Line {
  section: string;
  account_id: [number, string];
  balance: number;
}

// Both boundaries go through the IST helpers rather than raw
// `new Date().toISOString()`. Building a local midnight and serialising it
// to UTC walks the date back a day for every India-based user — the default
// "from" for September rendered as 2026-08-31, quietly pulling an extra
// day's postings into the P&L (dashboard read +₹3.88L profit for the month
// while this report read a ₹13.2L loss over the same "month").
function today() {
  return istTodayIso();
}

function firstOfMonth() {
  const now = istNow();
  return istDateIso(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function Section({ section, lines }: { section: ReportSection; lines: Line[] }) {
  const subtotal = lines.reduce((sum, l) => sum + l.balance, 0);
  return (
    <div className="border border-border bg-card">
      <p className="border-b border-border px-4 py-3 text-sm font-medium">{SECTION_LABELS[section]}</p>
      <table className="w-full text-sm">
        <tbody>
          {lines.map((l) => (
            <tr key={l.account_id[0]} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted-foreground">{l.account_id[1]}</td>
              <td className="tabular px-4 py-2 text-right font-mono">{formatMoney(l.balance)}</td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing posted here yet.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="rule-subtotal">
            <td className="px-4 py-2.5 font-medium">Subtotal</td>
            <td className="tabular px-4 py-2.5 text-right font-mono font-medium">{formatMoney(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function ReportView({ reportType }: { reportType: "balance_sheet" | "profit_loss" }) {
  const [wizardId, setWizardId] = useState<number | null>(null);
  const [dateTo, setDateTo] = useState(today());
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [lines, setLines] = useState<Line[]>([]);
  const [netResult, setNetResult] = useState(0);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      try {
        const res = await generateReport(
          wizardId,
          reportType,
          dateTo,
          reportType === "profit_loss" ? dateFrom : null,
        );
        setWizardId(res.wizardId);
        setLines(res.lines as Line[]);
        setNetResult(res.netResult);
      } catch {
        toast.error("Couldn't generate the report.");
      }
    });
  }

  // Generate once on first load with today's defaults.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const by = (section: ReportSection) => lines.filter((l) => l.section === section);
  const totalOf = (section: ReportSection) => by(section).reduce((sum, l) => sum + l.balance, 0);
  const hasData = lines.length > 0;

  const isBalanceSheet = reportType === "balance_sheet";
  const left = isBalanceSheet ? "asset" : "income";
  const right1 = isBalanceSheet ? "liability" : "expense";
  const right2: ReportSection | null = isBalanceSheet ? "equity" : null;

  const summaryData = isBalanceSheet
    ? [
        { name: "Assets", value: totalOf("asset") },
        { name: "Liabilities + Capital", value: totalOf("liability") + totalOf("equity") },
      ]
    : [
        { name: "Income", value: totalOf("income") },
        { name: "Expenses", value: totalOf("expense") },
        { name: "Net result", value: netResult },
      ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          {reportType === "profit_loss" && (
            <div className="space-y-1.5">
              <Label htmlFor="date-from">Date from</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (e.target.value && dateTo && dateTo < e.target.value) setDateTo(e.target.value);
                }}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="date-to">Date to</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              min={reportType === "profit_loss" ? dateFrom || undefined : undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button onClick={generate} disabled={pending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
        <DownloadPdfButton />
      </div>

      {/* Only visible in the printed/PDF output — the controls above and
          the tab strip above that are both print:hidden, so without this
          a saved PDF would open on a bare table with no title or date. */}
      <div className="mb-6 hidden print:block">
        <h1 className="font-heading text-xl">{isBalanceSheet ? "Balance Sheet" : "Profit & Loss"}</h1>
        <p className="text-sm text-muted-foreground">
          {reportType === "profit_loss" ? `${formatDate(dateFrom)} – ` : "As of "}
          {formatDate(dateTo)}
        </p>
      </div>

      {hasData ? (
        <>
          <div className="mt-8 border border-border bg-card p-6 print:border-0 print:p-0">
            <ReportSummaryChart data={summaryData} currencySymbol="₹" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 print:grid-cols-2">
            <Section section={left} lines={by(left)} />
            <div className="space-y-6">
              <Section section={right1} lines={by(right1)} />
              {right2 && <Section section={right2} lines={by(right2)} />}
            </div>
          </div>

          {reportType === "profit_loss" && (
            <div className="mt-6 border border-border bg-card">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="rule-total">
                    <td className="px-4 py-3 font-medium">Net result</td>
                    <td className="tabular px-4 py-3 text-right font-mono font-medium">
                      {formatMoney(netResult)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="mt-8 border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No posted entries in this range yet.
        </p>
      )}
    </div>
  );
}
