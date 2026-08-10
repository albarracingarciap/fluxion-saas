'use client';

import { FilePlus2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { SaveReportEvidenceModal, type SaveReportEvidencePayload } from '@/components/inventory/save-report-evidence-modal';
import { saveGapReportAsEvidence } from './actions';

type Props = {
  aiSystemId: string;
  systemName?: string;
  riskLevel?: string;
  totalGapSignals?: number;
  pendingObligationsCount?: number;
  isoGapsCount?: number;
};

export function SaveGapReportButton({
  aiSystemId,
  systemName,
  riskLevel,
  totalGapSignals,
  pendingObligationsCount,
  isoGapsCount,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultTags = [
    ...(riskLevel ? [`risk-${riskLevel.toLowerCase()}`] : []),
    ...(typeof totalGapSignals === 'number' && totalGapSignals > 10 ? ['gap-critico'] : []),
  ];

  const summaryLines = [
    `${systemName ?? 'Sistema'} · ${riskLevel ?? 'sin clasificar'}`,
    typeof totalGapSignals === 'number'
      ? `${totalGapSignals} señales de gap activas`
      : null,
    typeof pendingObligationsCount === 'number' && typeof isoGapsCount === 'number'
      ? `${pendingObligationsCount} obligaciones pendientes · ${isoGapsCount} gaps ISO 42001`
      : null,
  ].filter((s): s is string => Boolean(s));

  const handleConfirm = (payload: SaveReportEvidencePayload) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveGapReportAsEvidence({
        aiSystemId,
        tags: payload.tags,
        expiresAt: payload.expiresAt,
        validationNotes: payload.validationNotes,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess('Informe guardado como evidencia (pendiente de revisión).');
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12px] font-medium bg-ltcard hover:bg-ltbg border border-ltb text-lttm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        reportLabel="Gap report"
        helperText="Vas a congelar el estado actual de gaps del sistema. Como los gaps cambian rápido, este snapshot caduca antes que los demás documentos. Quedará archivado y se podrá descartar al regenerarlo."
        defaultTags={defaultTags}
        defaultExpiryDays={90}
        summaryLines={summaryLines.length > 0 ? summaryLines : undefined}
      />
    </div>
  );
}
