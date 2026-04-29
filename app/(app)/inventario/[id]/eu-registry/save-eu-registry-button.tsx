'use client';

import { FilePlus2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { SaveReportEvidenceModal, type SaveReportEvidencePayload } from '@/components/inventory/save-report-evidence-modal';
import { saveEuRegistryAsEvidence } from './actions';

type Props = {
  aiSystemId: string;
  systemName?: string;
  riskLevel?: string;
  readinessScore?: number;
  ready?: boolean;
  missingCount?: number;
};

export function SaveEuRegistryButton({
  aiSystemId,
  systemName,
  riskLevel,
  readinessScore,
  ready,
  missingCount,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultTags = [
    ...(riskLevel ? [`risk-${riskLevel.toLowerCase()}`] : []),
  ];

  const summaryLines = [
    `${systemName ?? 'Sistema'} · ${riskLevel ?? 'sin clasificar'}`,
    typeof readinessScore === 'number'
      ? `Readiness: ${readinessScore}% · ${ready ? 'lista para registro' : `${missingCount ?? 0} item${(missingCount ?? 0) !== 1 ? 's' : ''} pendiente${(missingCount ?? 0) !== 1 ? 's' : ''}`}`
      : null,
  ].filter((s): s is string => Boolean(s));

  const handleConfirm = (payload: SaveReportEvidencePayload) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveEuRegistryAsEvidence({
        aiSystemId,
        tags: payload.tags,
        expiresAt: payload.expiresAt,
        validationNotes: payload.validationNotes,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess('Ficha de registro guardada como evidencia (pendiente de revisión).');
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 print:hidden">
      <button
        type="button"
        onClick={() => { setError(null); setSuccess(null); setIsOpen(true); }}
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

      <SaveReportEvidenceModal
        open={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        onConfirm={handleConfirm}
        isPending={isPending}
        reportLabel="Ficha de pre-registro EU"
        helperText="Vas a congelar un snapshot del estado de readiness para el registro EU. Quedará archivado como evidencia del sistema y podrá ser revisado o descartado desde la biblioteca."
        defaultTags={defaultTags}
        defaultExpiryDays={180}
        summaryLines={summaryLines.length > 0 ? summaryLines : undefined}
      />
    </div>
  );
}
