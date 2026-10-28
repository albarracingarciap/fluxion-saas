'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, AlertCircle, ArrowLeft, CheckCircle2, Circle, Database, FileCheck2, Plus, Trash2,
} from 'lucide-react';

import { uploadEvidenceFile } from '@/lib/evidences/storage';
import {
  CHECK_RESULT_LABEL,
  DATA_CONTROL_LABEL,
  INDICATOR_SOURCE_LABEL,
  SUGGESTED_INDICATORS,
  addMonths,
  type CheckKind,
  type CheckResult,
  type DataControl,
  type Indicator,
  type IndicatorSource,
  type OperationStatus,
} from '@/lib/governance/operation';

import {
  addOperationCheck,
  createOperationEvidence,
  previewMonitoringData,
  saveInputData,
  saveMonitoringPlan,
  type OperationCheckRow,
  type SystemOperation,
} from './actions';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt outline-none focus:border-brand-cyan disabled:opacity-60';
const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm';
const btn = 'px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium disabled:opacity-50';
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' });

const RESULT_CLS: Record<CheckResult, string> = {
  conforme: 'bg-grdim border-grb text-gr',
  desviaciones: 'bg-ordim border-orb text-or',
  no_conforme: 'bg-redim border-reb text-re',
};

function Estado({ status }: { status: OperationStatus }) {
  return (
    <div className="flex flex-col gap-1.5">
      {status.items.map((i) => (
        <p key={i.key} className="font-sora text-[12.5px] text-ltt2 flex items-start gap-1.5">
          {i.done ? <CheckCircle2 size={14} className="text-gr shrink-0 mt-0.5" /> : <Circle size={14} className="text-lttm shrink-0 mt-0.5" />}
          {i.label}
        </p>
      ))}
      {status.nextDueOn && (
        <p className={`font-sora text-[12px] ${status.overdue ? 'text-re' : 'text-lttm'}`}>
          {status.overdue ? 'Vencida desde el ' : 'Próxima antes del '}{fecha(status.nextDueOn)}
        </p>
      )}
    </div>
  );
}

function Seccion({ icon, title, intro, children }: { icon: React.ReactNode; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="border border-ltb rounded-[12px] bg-ltcard p-5 flex flex-col gap-4">
      <div>
        <p className={`${label} flex items-center gap-1.5`}>{icon} {title}</p>
        <p className="font-sora text-[12.5px] text-lttm mt-1.5 max-w-3xl">{intro}</p>
      </div>
      {children}
    </section>
  );
}

/** Datos de entrada (Art. 26.4) y vigilancia del funcionamiento (Art. 26.5) del sistema (B28). */
export function OperacionClient({ systemId, data }: { systemId: string; data: SystemOperation }) {
  const checksDe = (k: CheckKind) => data.checks.filter((c) => c.kind === k);
  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 py-6 pb-16">
      <Link href={`/inventario/${systemId}`} className="font-sora text-[12.5px] text-lttm hover:text-ltt w-fit flex items-center gap-1">
        <ArrowLeft size={13} /> {data.systemName}
      </Link>
      <div>
        <h1 className="font-fraunces text-[26px] text-ltt">Datos de entrada y vigilancia del funcionamiento</h1>
        <p className="font-sora text-[13px] text-lttm mt-1 max-w-3xl">
          {data.applies
            ? 'Obligatorio: sistema de alto riesgo y la organización es responsable del despliegue (AI Act, Art. 26.4 y 26.5).'
            : 'Opcional en este sistema: el AI Act lo exige en alto riesgo al responsable del despliegue. Se puede llevar como buena práctica.'}
        </p>
      </div>

      <DatosEntrada systemId={systemId} data={data} checks={checksDe('input_data')} />
      <Vigilancia systemId={systemId} data={data} checks={checksDe('monitoring')} />
    </div>
  );
}

// ── Datos de entrada ─────────────────────────────────────────────────────────

function DatosEntrada({ systemId, data, checks }: { systemId: string; data: SystemOperation; checks: OperationCheckRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const r = data.inputData;
  const [editing, setEditing] = useState(!r);
  const [f, setF] = useState({
    controlledBy: (r?.controlledBy ?? 'organization') as DataControl,
    expectedData: r?.expectedData ?? '',
    sources: r?.sources ?? '',
    controls: r?.controls ?? '',
    verifyMonths: String(r?.verifyMonths ?? 6),
    notes: r?.notes ?? '',
  });
  const propios = f.controlledBy !== 'provider';

  function guardar() {
    setMsg(null);
    start(async () => {
      const res = await saveInputData({ systemId, ...f, verifyMonths: Number(f.verifyMonths) });
      if ('error' in res) return setMsg({ ok: false, text: res.error });
      setEditing(false);
      setMsg({ ok: true, text: 'Datos de entrada guardados.' });
      router.refresh();
    });
  }

  return (
    <Seccion
      icon={<Database size={12} />}
      title="Datos de entrada (Art. 26.4)"
      intro="Qué datos espera el sistema, de dónde vienen y cómo se comprueba que son pertinentes y suficientemente representativos para su finalidad. Se verifica periódicamente con un informe de calidad o perfilado, o una muestra anonimizada; nunca con el dataset en bruto."
    >
      {r && <Estado status={data.status.inputData} />}
      {msg && <p className={`font-sora text-[12.5px] ${msg.ok ? 'text-gr' : 'text-re'}`}>{msg.text}</p>}

      {editing && data.canEdit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className={`${label} mb-1.5`}>Quién controla los datos de entrada</p>
            <select value={f.controlledBy} onChange={(e) => setF({ ...f, controlledBy: e.target.value as DataControl })} className={inputCls}>
              {(Object.keys(DATA_CONTROL_LABEL) as DataControl[]).map((k) => <option key={k} value={k}>{DATA_CONTROL_LABEL[k]}</option>)}
            </select>
          </div>
          {propios && (
            <div>
              <p className={`${label} mb-1.5`}>Verificar cada (meses)</p>
              <input type="number" min={1} max={36} value={f.verifyMonths} onChange={(e) => setF({ ...f, verifyMonths: e.target.value })} className={inputCls} />
            </div>
          )}
          <div className="md:col-span-2">
            <p className={`${label} mb-1.5`}>Qué espera el sistema *</p>
            <textarea rows={3} value={f.expectedData} onChange={(e) => setF({ ...f, expectedData: e.target.value })} className={inputCls + ' resize-y'}
              placeholder="Tipo de datos, formato, rangos válidos, población o casos de uso previstos, según las instrucciones de uso del proveedor." />
          </div>
          {propios ? (
            <>
              <div className="md:col-span-2">
                <p className={`${label} mb-1.5`}>Fuentes de los datos</p>
                <textarea rows={2} value={f.sources} onChange={(e) => setF({ ...f, sources: e.target.value })} className={inputCls + ' resize-y'} placeholder="Sistemas, bases de datos o procesos de los que vienen." />
              </div>
              <div className="md:col-span-2">
                <p className={`${label} mb-1.5`}>Controles de calidad y representatividad</p>
                <textarea rows={2} value={f.controls} onChange={(e) => setF({ ...f, controls: e.target.value })} className={inputCls + ' resize-y'}
                  placeholder="Validación de formato y rangos, valores ausentes, duplicados, cobertura de la población prevista…" />
              </div>
            </>
          ) : (
            <p className="md:col-span-2 font-sora text-[12px] text-lttm">
              Si solo los controla el proveedor, el Art. 26.4 no obliga a verificarlos: basta con declararlo y describir qué espera el sistema.
            </p>
          )}
          <div className="md:col-span-2">
            <p className={`${label} mb-1.5`}>Notas</p>
            <textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={inputCls + ' resize-y'} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={guardar} disabled={pending} className={btn}>Guardar</button>
            {r && <button onClick={() => setEditing(false)} className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-lttm">Cancelar</button>}
          </div>
        </div>
      ) : r ? (
        <div className="flex flex-col gap-2 font-sora text-[12.5px] text-ltt2">
          <p><span className="text-lttm">Los controla:</span> {DATA_CONTROL_LABEL[r.controlledBy]}{r.controlledBy !== 'provider' ? ` · verificación cada ${r.verifyMonths} meses` : ''}</p>
          <p className="whitespace-pre-line"><span className="text-lttm">Qué espera el sistema:</span> {r.expectedData}</p>
          {r.sources && <p className="whitespace-pre-line"><span className="text-lttm">Fuentes:</span> {r.sources}</p>}
          {r.controls && <p className="whitespace-pre-line"><span className="text-lttm">Controles:</span> {r.controls}</p>}
          {data.canEdit && <button onClick={() => setEditing(true)} className="font-sora text-[12px] text-brand-cyan hover:underline w-fit">Editar</button>}
        </div>
      ) : (
        <p className="font-sora text-[12.5px] text-lttm italic">Sin declarar.</p>
      )}

      {r && r.controlledBy !== 'provider' && (
        <Verificaciones systemId={systemId} data={data} kind="input_data" checks={checks} />
      )}
    </Seccion>
  );
}

// ── Vigilancia del funcionamiento ────────────────────────────────────────────

function Vigilancia({ systemId, data, checks }: { systemId: string; data: SystemOperation; checks: OperationCheckRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const p = data.monitoring;
  const [editing, setEditing] = useState(!p);
  const [indicators, setIndicators] = useState<Indicator[]>(p?.indicators ?? []);
  const [reviewMonths, setReviewMonths] = useState(String(p?.reviewMonths ?? 3));
  const [owner, setOwner] = useState(p?.ownerProfileId ?? '');
  const [notes, setNotes] = useState(p?.notes ?? '');
  const nombre = new Map(data.members.map((m) => [m.id, m.name]));
  const setInd = (i: number, c: Partial<Indicator>) => setIndicators(indicators.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const sugeridos = SUGGESTED_INDICATORS.filter((s) => !indicators.some((i) => i.name === s.name));

  function guardar() {
    setMsg(null);
    start(async () => {
      const res = await saveMonitoringPlan({ systemId, indicators, reviewMonths: Number(reviewMonths), ownerProfileId: owner || null, notes });
      if ('error' in res) return setMsg({ ok: false, text: res.error });
      setEditing(false);
      setMsg({ ok: true, text: 'Plan de vigilancia guardado.' });
      router.refresh();
    });
  }

  return (
    <Seccion
      icon={<Activity size={12} />}
      title="Vigilancia del funcionamiento (Art. 26.5)"
      intro="Qué se vigila, con qué umbrales, con qué frecuencia y quién. Cada revisión recoge los datos de la aplicación del periodo (señales, supervisión humana, telemetría, incidentes) y, si hay riesgos, enlaza con avisar al proveedor, suspender el uso o dar parte de un incidente."
    >
      {p && <Estado status={data.status.monitoring} />}
      {msg && <p className={`font-sora text-[12.5px] ${msg.ok ? 'text-gr' : 'text-re'}`}>{msg.text}</p>}

      {editing && data.canEdit ? (
        <div className="flex flex-col gap-3">
          <p className={label}>Indicadores</p>
          {indicators.map((ind, i) => (
            <div key={ind.id} className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1.4fr_auto] gap-2 items-center">
              <input value={ind.name} onChange={(e) => setInd(i, { name: e.target.value })} className={inputCls} placeholder="Indicador" />
              <input value={ind.threshold} onChange={(e) => setInd(i, { threshold: e.target.value })} className={inputCls} placeholder="Umbral (p. ej. > 5 % mensual)" />
              <select value={ind.source} onChange={(e) => setInd(i, { source: e.target.value as IndicatorSource })} className={inputCls}>
                {(Object.keys(INDICATOR_SOURCE_LABEL) as IndicatorSource[]).map((k) => <option key={k} value={k}>{INDICATOR_SOURCE_LABEL[k]}</option>)}
              </select>
              <button onClick={() => setIndicators(indicators.filter((_, j) => j !== i))} className="p-1 text-lttm hover:text-re" title="Quitar"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIndicators([...indicators, { id: `i${Date.now().toString(36)}`, name: '', threshold: '', source: 'manual' }])}
              className="flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline"><Plus size={12} /> Añadir indicador</button>
            {sugeridos.map((s) => (
              <button key={s.name} onClick={() => setIndicators([...indicators, { ...s, id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` }])}
                className="font-sora text-[11.5px] px-2 py-0.5 rounded-full border border-ltb text-ltt2 hover:border-brand-cyan">+ {s.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className={`${label} mb-1.5`}>Revisar cada (meses)</p>
              <input type="number" min={1} max={24} value={reviewMonths} onChange={(e) => setReviewMonths(e.target.value)} className={inputCls} />
            </div>
            <div>
              <p className={`${label} mb-1.5`}>Responsable de la vigilancia</p>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
                <option value="">Sin responsable</option>
                {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <p className={`${label} mb-1.5`}>Notas</p>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + ' resize-y'}
                placeholder="Instrucciones de uso del proveedor que se siguen, herramientas de monitorización…" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={guardar} disabled={pending} className={btn}>Guardar</button>
            {p && <button onClick={() => setEditing(false)} className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-lttm">Cancelar</button>}
          </div>
        </div>
      ) : p ? (
        <div className="flex flex-col gap-2">
          <table className="w-full font-sora text-[12.5px]">
            <thead><tr className="text-left text-lttm"><th className="font-normal pb-1">Indicador</th><th className="font-normal pb-1">Umbral</th><th className="font-normal pb-1">Fuente</th></tr></thead>
            <tbody>
              {p.indicators.map((i) => (
                <tr key={i.id} className="border-t border-ltb"><td className="py-1.5 text-ltt">{i.name}</td><td className="py-1.5 text-ltt2">{i.threshold || '—'}</td><td className="py-1.5 text-ltt2">{INDICATOR_SOURCE_LABEL[i.source]}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="font-sora text-[12.5px] text-ltt2">
            Revisión cada {p.reviewMonths} meses · Responsable: {p.ownerProfileId ? nombre.get(p.ownerProfileId) ?? '—' : 'sin asignar'}
          </p>
          {p.notes && <p className="font-sora text-[12.5px] text-ltt2 whitespace-pre-line">{p.notes}</p>}
          {data.canEdit && <button onClick={() => setEditing(true)} className="font-sora text-[12px] text-brand-cyan hover:underline w-fit">Editar</button>}
        </div>
      ) : (
        <p className="font-sora text-[12.5px] text-lttm italic">Sin plan de vigilancia.</p>
      )}

      {p && <Verificaciones systemId={systemId} data={data} kind="monitoring" checks={checks} />}
    </Seccion>
  );
}

// ── Verificaciones y revisiones ──────────────────────────────────────────────

function Verificaciones({ systemId, data, kind, checks }: { systemId: string; data: SystemOperation; kind: CheckKind; checks: OperationCheckRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datos = kind === 'input_data';
  const ultima = checks[0]?.checkedAt ?? null;
  const meses = datos ? data.inputData?.verifyMonths ?? 6 : data.monitoring?.reviewMonths ?? 3;
  const [f, setF] = useState({
    periodStart: ultima ?? addMonths(hoy(), -meses),
    checkedAt: hoy(),
    result: 'conforme' as CheckResult,
    summary: '',
    actions: '',
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [nueva, setNueva] = useState({ evidenceKind: (datos ? 'informe' : 'monitorizacion') as 'informe' | 'muestra' | 'monitorizacion', title: '', url: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function verDatos() {
    setError(null);
    start(async () => {
      const res = await previewMonitoringData(systemId, f.periodStart, f.checkedAt);
      if ('error' in res) setError(res.error);
      else setPreview(res.summary);
    });
  }

  function registrar() {
    setError(null);
    start(async () => {
      const ids = [...evidenceIds];
      // Evidencia nueva: se registra en borrador y se sube el fichero.
      if (nueva.title.trim() && (file || nueva.url.trim())) {
        const ev = await createOperationEvidence({ systemId, kind, evidenceKind: nueva.evidenceKind, title: nueva.title, externalUrl: nueva.url || null, hasPendingFile: Boolean(file) });
        if ('error' in ev) return setError(ev.error);
        if (file) {
          const up = await uploadEvidenceFile(file, data.organizationId, ev.id);
          if (up.error) return setError(`La evidencia se registró, pero el fichero no se pudo subir: ${up.error} Súbelo desde Evidencias.`);
        }
        ids.push(ev.id);
      }
      const res = await addOperationCheck({ systemId, kind, ...f, periodStart: datos ? null : f.periodStart, evidenceIds: ids });
      if ('error' in res) return setError(res.error);
      setOpen(false);
      setF({ ...f, summary: '', actions: '' });
      setEvidenceIds([]); setNueva({ ...nueva, title: '', url: '' }); setFile(null); setPreview(null);
      router.refresh();
    });
  }

  return (
    <div className="border-t border-ltb pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className={label}>{datos ? 'Verificaciones' : 'Revisiones'} ({checks.length})</p>
        {data.canEdit && !open && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline">
            <Plus size={12} /> {datos ? 'Registrar verificación' : 'Registrar revisión'}
          </button>
        )}
      </div>

      {open && (
        <div className="border border-ltb rounded-[10px] bg-ltcard2 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {!datos && (
              <div>
                <p className={`${label} mb-1.5`}>Desde</p>
                <input type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} className={inputCls} />
              </div>
            )}
            <div>
              <p className={`${label} mb-1.5`}>{datos ? 'Fecha de la verificación' : 'Hasta (fecha de la revisión)'}</p>
              <input type="date" max={hoy()} value={f.checkedAt} onChange={(e) => setF({ ...f, checkedAt: e.target.value })} className={inputCls} />
            </div>
            <div>
              <p className={`${label} mb-1.5`}>Resultado</p>
              <select value={f.result} onChange={(e) => setF({ ...f, result: e.target.value as CheckResult })} className={inputCls}>
                {(Object.keys(CHECK_RESULT_LABEL) as CheckResult[]).map((k) => <option key={k} value={k}>{CHECK_RESULT_LABEL[k]}</option>)}
              </select>
            </div>
          </div>

          {!datos && (
            <div className="flex flex-col gap-1.5">
              <button onClick={verDatos} disabled={pending} className="font-sora text-[12px] text-brand-cyan hover:underline w-fit disabled:opacity-50">Ver los datos de la aplicación del periodo</button>
              {preview && <p className="font-sora text-[12px] text-ltt2 bg-ltcard border border-ltb rounded-[8px] px-3 py-2 whitespace-pre-line">{preview}</p>}
              <p className="font-sora text-[11.5px] text-lttm">Se guardan con la revisión al registrarla.</p>
            </div>
          )}

          <div>
            <p className={`${label} mb-1.5`}>Qué se ha comprobado y con qué resultado *</p>
            <textarea rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className={inputCls + ' resize-y'}
              placeholder={datos ? 'Muestra o periodo analizado, controles aplicados, cobertura de la población prevista…' : 'Valor de cada indicador frente a su umbral, uso conforme a las instrucciones…'} />
          </div>
          {f.result !== 'conforme' && (
            <div>
              <p className={`${label} mb-1.5`}>Medidas adoptadas *</p>
              <textarea rows={2} value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} className={inputCls + ' resize-y'} />
              <p className="font-sora text-[12px] text-ltt2 mt-1.5 flex items-start gap-1.5">
                <AlertCircle size={13} className="text-or shrink-0 mt-0.5" />
                <span>
                  Si el sistema puede presentar un riesgo, suspende el uso y avisa al proveedor en{' '}
                  <Link href={`/inventario/${systemId}#uso-sistema`} className="text-brand-cyan hover:underline">Uso del sistema</Link>, o da parte de un incidente en{' '}
                  <Link href="/incidentes" className="text-brand-cyan hover:underline">Incidentes</Link> (AI Act, Art. 26.5).
                </span>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className={label}>Evidencias</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2">
              {datos ? (
                <select value={nueva.evidenceKind} onChange={(e) => setNueva({ ...nueva, evidenceKind: e.target.value as 'informe' | 'muestra' })} className={inputCls}>
                  <option value="informe">Informe de calidad o perfilado</option>
                  <option value="muestra">Muestra anonimizada</option>
                </select>
              ) : (
                <span className="font-sora text-[12.5px] text-ltt2 self-center">Registro de monitorización</span>
              )}
              <input value={nueva.title} onChange={(e) => setNueva({ ...nueva, title: e.target.value })} className={inputCls} placeholder="Título de la evidencia nueva" />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="font-sora text-[12px] text-ltt2" />
              <input value={nueva.url} onChange={(e) => setNueva({ ...nueva, url: e.target.value })} className={inputCls} placeholder="o URL" />
            </div>
            {datos && (
              <p className="font-sora text-[11.5px] text-lttm">No subas el dataset en bruto: puede contener datos personales. Una muestra debe estar anonimizada.</p>
            )}
            <select
              value=""
              onChange={(e) => e.target.value && setEvidenceIds(Array.from(new Set([...evidenceIds, e.target.value])))}
              className={inputCls}
            >
              <option value="">Vincular una evidencia existente…</option>
              {data.evidences.filter((e) => !evidenceIds.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            {evidenceIds.map((id) => (
              <p key={id} className="font-sora text-[12px] text-ltt2 flex items-center gap-2">
                <FileCheck2 size={12} /> {data.evidences.find((e) => e.id === id)?.title}
                <button onClick={() => setEvidenceIds(evidenceIds.filter((x) => x !== id))} className="text-lttm hover:text-re"><Trash2 size={12} /></button>
              </p>
            ))}
            <p className="font-sora text-[11.5px] text-lttm">Las evidencias nuevas entran en borrador y cuentan cuando se validan en Evidencias.</p>
          </div>

          {error && <p className="font-sora text-[12.5px] text-re">{error}</p>}
          <div className="flex gap-2">
            <button onClick={registrar} disabled={pending} className={btn}>Registrar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-lttm">Cancelar</button>
          </div>
        </div>
      )}

      {checks.length === 0 ? (
        <p className="font-sora text-[12.5px] text-lttm italic">{datos ? 'Aún no hay verificaciones.' : 'Aún no hay revisiones.'}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.id} className="border border-ltb rounded-[10px] p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-sora text-[13px] text-ltt font-medium">
                  {c.periodStart ? `${fecha(c.periodStart)} – ` : ''}{fecha(c.checkedAt)}
                  {c.createdByName ? <span className="text-lttm font-normal"> · {c.createdByName}</span> : null}
                </p>
                <span className={`px-2 py-0.5 rounded-[5px] border font-sora text-[11px] font-semibold ${RESULT_CLS[c.result]}`}>{CHECK_RESULT_LABEL[c.result]}</span>
              </div>
              <p className="font-sora text-[12.5px] text-ltt2 whitespace-pre-line">{c.summary}</p>
              {c.dataSummary && <p className="font-sora text-[12px] text-ltt2 bg-ltcard2 border border-ltb rounded-[8px] px-3 py-2 whitespace-pre-line">{c.dataSummary}</p>}
              {c.actions && <p className="font-sora text-[12.5px] text-ltt2 whitespace-pre-line"><span className="text-lttm">Medidas:</span> {c.actions}</p>}
              {c.evidences.map((e) => (
                <Link key={e.id} href={`/evidencias/${e.id}`} className="font-sora text-[12px] text-brand-cyan hover:underline flex items-center gap-1.5 w-fit">
                  <FileCheck2 size={12} /> {e.title} <span className="text-lttm">({e.status === 'valid' ? 'válida' : e.status === 'draft' ? 'borrador' : e.status === 'pending_review' ? 'pendiente de revisión' : e.status})</span>
                </Link>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
