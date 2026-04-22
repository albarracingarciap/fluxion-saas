'use client';

import { Download, Printer } from 'lucide-react';

export function TechnicalDossierPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all print:hidden"
    >
      <Printer className="w-4 h-4" />
      <Download className="w-4 h-4" />
      Exportar / Imprimir
    </button>
  );
}
