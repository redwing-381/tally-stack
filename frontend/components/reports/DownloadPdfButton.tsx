"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * These three reports are computed fresh from account.move.line on every
 * view (there's no stored document for Odoo to hand back a native report
 * URL for, unlike an invoice) — so "download as PDF" means the browser's
 * own print-to-PDF, same mechanism the invoice document's Print button
 * already relies on. print:hidden on the controls and the app chrome
 * (Sidebar, the assistant button) keeps the saved PDF to just the report.
 */
export function DownloadPdfButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Download size={15} /> Download PDF
    </Button>
  );
}
