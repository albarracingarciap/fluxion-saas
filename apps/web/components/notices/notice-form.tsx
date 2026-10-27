'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { NOTICE_RECIPIENTS, NOTICE_RECIPIENT_LABEL, type NoticeRecipient } from '@/lib/ai-systems/notices';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';
const labelCls = 'block font-sora text-[11px] text-ltt2 mt-2 mb-1';
const botonCls = 'px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium transition-colors disabled:opacity-60';

const hoy = () => new Date().toISOString().slice(0, 10);

export type NoticeFormValues = {
  recipient: NoticeRecipient;
  recipientName: string;
  notifiedAt: string;
  channel: string;
  reference: string;
  evidenceId: string | null;
};

/**
 * Registrar un aviso a terceros (B25a/B25b, AI Act, Art. 26.5): suspensión del
 * uso o incidente. Fluxion no lo envía: deja constancia de que se hizo.
 */
export function NoticeForm({
  recipients = NOTICE_RECIPIENTS,
  defaultRecipient,
  evidences,
  minDate,
  onSubmit,
  onCancel,
}: {
  recipients?: readonly NoticeRecipient[];
  defaultRecipient?: NoticeRecipient;
  evidences: ReadonlyArray<{ id: string; title: string }>;
  /** Fecha mínima del aviso (AAAA-MM-DD). */
  minDate?: string;
  onSubmit: (values: NoticeFormValues) => Promise<{ error?: string } | { ok: true }>;
  onCancel: () => void;
}) {
  const [recipient, setRecipient] = useState<NoticeRecipient>(defaultRecipient ?? recipients[0]);
  const [recipientName, setRecipientName] = useState('');
  const [notifiedAt, setNotifiedAt] = useState(hoy());
  const [channel, setChannel] = useState('');
  const [reference, setReference] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  function enviar() {
    setError(null);
    start(async () => {
      const res = await onSubmit({ recipient, recipientName, notifiedAt, channel, reference, evidenceId: evidenceId || null });
      if ('error' in res && res.error) setError(res.error);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ltb">
      <p className="font-sora text-[11px] text-lttm">Fluxion no envía el aviso: deja constancia de que se hizo.</p>
      <label className={labelCls}>Destinatario</label>
      <select className={inputCls} value={recipient} onChange={(e) => setRecipient(e.target.value as NoticeRecipient)} disabled={saving}>
        {recipients.map((r) => <option key={r} value={r}>{NOTICE_RECIPIENT_LABEL[r]}</option>)}
      </select>
      <label className={labelCls}>Nombre (opcional)</label>
      <input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={saving}
        placeholder="A quién se avisa: proveedor, distribuidor, autoridad…" />
      <label className={labelCls}>Fecha del aviso</label>
      <input type="date" className={inputCls} value={notifiedAt} min={minDate} max={hoy()} onChange={(e) => setNotifiedAt(e.target.value)} disabled={saving} />
      <label className={labelCls}>Canal (opcional)</label>
      <input className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)} disabled={saving} placeholder="Correo, sede electrónica, portal del proveedor…" />
      <label className={labelCls}>Referencia (opcional)</label>
      <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} disabled={saving} placeholder="Acuse, número de registro o de ticket" />
      <label className={labelCls}>Evidencia (opcional)</label>
      <select className={inputCls} value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} disabled={saving}>
        <option value="">Sin evidencia</option>
        {evidences.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={enviar} disabled={saving} className={`${botonCls} bg-brand-blue text-white hover:opacity-90 inline-flex items-center gap-1.5`}>
          {saving && <Loader2 className="w-3 h-3 animate-spin" />} Registrar aviso
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={`${botonCls} text-lttm hover:text-ltt`}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
