import { ReportTabs } from "@/components/reports/ReportTabs";
import { ReportView } from "@/components/reports/ReportView";

export default function BalanceSheetPage() {
  return (
    <div className="p-10">
      <h1 className="font-heading text-2xl">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A cumulative snapshot of assets, liabilities and capital as of the chosen date.
      </p>
      <div className="mt-6">
        <ReportTabs />
      </div>
      <div className="mt-8">
        <ReportView reportType="balance_sheet" />
      </div>
    </div>
  );
}
