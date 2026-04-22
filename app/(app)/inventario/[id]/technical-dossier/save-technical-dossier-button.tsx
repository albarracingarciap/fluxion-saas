'use client';

import { FilePlus2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { saveTechnicalDossierAsEvidence } from './actions';

export function SaveTechnicalDossierButton({ aiSystemId }: { aiSystemId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await saveTechnicalDossierAsEvidence({ aiSystemId });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess('Dossier guardado como evidencia técnica.');
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 print:hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12px] font-medium text-[#14233c] bg-white border border-[#d7e6fb] hover:bg-[#f8fbff] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
        Guardar como evidencia
      </button>
      {error && (
        <div className="max-w-[280px] text-right text-[11px] font-sora text-[#df3e2f]">{error}</div>
      )}
      {success && (
        <div className="max-w-[280px] text-right text-[11px] font-sora text-[#2a9d55]">{success}</div>
      )}
    </div>
  );
}
