"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog. Hidden when printing so it does not appear on paper. */
export function PrintButton() {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}
