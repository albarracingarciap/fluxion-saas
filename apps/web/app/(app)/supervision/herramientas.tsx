'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileDown, FileUp, Loader2 } from 'lucide-react';

import { HITL_CSV_COLUMNS, HITL_CSV_MAX_ROWS, HITL_CSV_TEMPLATE } from '@/lib/hitl/csv';

import { generateHitlReport, importHitlCsv, type HitlImportResult } from './actions';

const inputCls = 'px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard font-sora text-[12.5px] text-ltt outline-none focus:border-brand-cyan';
const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium disabled:opacity-50';
const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Importar decisiones desde CSV y generar el informe de un sistema como
 * evidencia (B30b). Solo para quienes documentan la supervisión.
 */
export function Herramientas({ systems, sistemaId, dias }: {
  systems: Array<{ id: string; name: string }>
  sistemaId: string | null
  dias: number
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [importSystem, setImportSystem] = useState(sistemaId ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<HitlImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const desdeDefecto = new Date(Date.now() - (dias - 1) * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(desdeDefecto);
  const [to, setTo] = useState(hoy());
  const [informe, setInforme] = useState<string | null>(null);

  function importar() {
    if (!file) return setError('Elige un fichero CSV.');
    setError(null); setResultado(null);
    start(async () => {
      const text = await file.text();
      const res = await importHitlCsv({ text, systemId: importSystem || null });
      if ('error' in res) return setError(res.error);
      setResultado(res);
      router.refresh();
    });
  }

  function generar() {
    if (!sistemaId) return;
    setError(null); setInforme(null);
    start(async () => {
      const res = await generateHitlReport({ systemId: sistemaId, from, to });
      if ('error' in res) return setError(res.error);
      setInforme(res.evidenceId);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-2.5">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5"><FileUp size={12} /> Importar decisiones desde CSV</p>
        <p className="font-sora text-[12px] text-lttm">
          Para quien no integra la API o revisa por muestreo. Columnas admitidas: <span className="font-plex text-[11px]">{HITL_CSV_COLUMNS.join(', ')}</span>.
          Obligatorias: case_ref, decision y occurred_at (sin zona horaria, se toma como UTC). Hasta {HITL_CSV_MAX_ROWS} filas.
          Una columna no admitida rechaza el fichero: nunca el contenido del caso.{' '}
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(HITL_CSV_TEMPLATE)}`} download="plantilla-decisiones.csv" className="text-brand-cyan hover:underline">Descargar plantilla</a>
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={importSystem} onChange={(e) => setImportSystem(e.target.value)} className={inputCls + ' max-w-[220px]'}>
            <option value="">Sistema según la columna system_id</option>
            {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="font-sora text-[12px] text-ltt2 max-w-[220px]" />
          <button onClick={importar} disabled={pending || !file} className={btn}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />} Importar
          </button>
        </div>
        {resultado && (
          <div className="font-sora text-[12px] text-ltt2">
            <p><span className="text-gr font-semibold">{resultado.accepted} importadas</span> · {resultado.duplicates} ya estaban · {resultado.rejected} rechazadas</p>
            {resultado.errors.map((e) => <p key={e.row} className="text-re">Fila {e.row}: {e.error}</p>)}
          </div>
        )}
      </div>

      <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-2.5">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5"><FileDown size={12} /> Informe como evidencia</p>
        {sistemaId ? (
          <>
            <p className="font-sora text-[12px] text-lttm">
              PDF del sistema con los indicadores, los revisores, los motivos y los indicios de sesgo del periodo, registrado
              como evidencia del sistema («Acta de supervisión humana»). También se adjunta solo a cada revisión del funcionamiento.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="font-sora text-[12px] text-lttm">a</span>
              <input type="date" value={to} max={hoy()} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              <button onClick={generar} disabled={pending} className={btn}>
                {pending ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} Generar informe
              </button>
            </div>
            {informe && <Link href={`/evidencias/${informe}`} className="font-sora text-[12px] text-brand-cyan hover:underline">Informe registrado como evidencia →</Link>}
          </>
        ) : (
          <p className="font-sora text-[12px] text-lttm">Elige un sistema en el selector de arriba para generar su informe.</p>
        )}
      </div>
      {error && <p className="lg:col-span-2 font-sora text-[12.5px] text-re">{error}</p>}
    </div>
  );
}
