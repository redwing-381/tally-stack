import { ReportTabs } from "@/components/reports/ReportTabs";
import { ReportView } from "@/components/reports/ReportView";

export default function ProfitLossPage() {
  return (
    <div className="p-10">
      <h1 className="font-heading text-2xl">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Income and expenses posted within the chosen date range.
      </p>
      <div className="mt-6">
        <ReportTabs />
      </div>
      <div className="mt-8">
        <ReportView reportType="profit_loss" />
      </div>
    </div>
  );
}
