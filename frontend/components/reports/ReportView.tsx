"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateReport } from "@/lib/odoo/actions";
import { formatMoney } from "@/lib/format";
import type { ReportSection } from "@/lib/odoo/types";

const SECTION_LABELS: Record<ReportSection, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Capital",
  income: "Income",
  expense: "Expenses",
};

const SECTION_ORDER: ReportSection[] = ["asset", "liability", "equity", "income", "expense"];

interface Line {
  section: string;
  account_id: [number, string];
  balance: number;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
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
        setLines(res.lines);
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

  const bySection = SECTION_ORDER.map((section) => ({
    section,
    lines: lines.filter((l) => l.section === section),
  })).filter((g) => g.lines.length > 0);

  return (
    <div>
      <div className="flex items-end gap-4">
        {reportType === "profit_loss" && (
          <div className="space-y-1.5">
            <Label htmlFor="date-from">Date from</Label>
            <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="date-to">Date to</Label>
          <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={pending} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {pending ? "Generating…" : "Generate"}
        </Button>
      </div>

      <div className="mt-8 max-w-2xl border border-border bg-card">
        {bySection.map((group) => {
          const subtotal = group.lines.reduce((sum, l) => sum + l.balance, 0);
          return (
            <div key={group.section} className="border-b border-border last:border-0">
              <p className="px-4 pt-4 text-sm font-medium">{SECTION_LABELS[group.section as ReportSection]}</p>
              <table className="w-full text-sm">
                <tbody>
                  {group.lines.map((l) => (
                    <tr key={l.account_id[0]}>
                      <td className="px-4 py-1.5 text-muted-foreground">{l.account_id[1]}</td>
                      <td className="tabular px-4 py-1.5 text-right font-mono">{formatMoney(l.balance)}</td>
                    </tr>
                  ))}
                  <tr className="rule-subtotal">
                    <td className="px-4 py-2 font-medium">Subtotal</td>
                    <td className="tabular px-4 py-2 text-right font-mono font-medium">{formatMoney(subtotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {bySection.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No posted entries in this range yet.
          </p>
        )}

        {reportType === "profit_loss" && bySection.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
