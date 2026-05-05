'use client';

import { Download, Printer } from 'lucide-react';

export function GapReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12px] font-medium bg-ltcard hover:bg-ltbg border border-ltb text-lttm transition-colors print:hidden"
    >
      <Printer className="w-4 h-4" />
      <Download className="w-4 h-4" />
      Exportar / Imprimir
    </button>
  );
}
