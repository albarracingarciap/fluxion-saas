'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert, X, Search, Check } from 'lucide-react';
import { getMappings, getAllObligations, getAllEvidenceTypes, createMapping, updateMapping, deleteMapping } from './actions';

// ── Searchable select ──────────────────────────────────────────────────────────
function SearchableSelect({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  options: { id: string; code: string; name: string }[]
  placeholder: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const selected          = options.find(o => o.id === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.code.toLowerCase().includes(query.toLowerCase()) ||
        o.name.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">{label}</label>
      {disabled && selected ? (
        <div className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora text-ltt opacity-60 flex gap-2">
          <span className="font-plex text-[12px] text-lttm shrink-0">{selected.code}</span>
          <span className="truncate">{selected.name}</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { if (!disabled) { setOpen(o => !o); setQuery(''); } }}
            className={`w-full bg-ltbg border rounded-lg px-3 py-2 text-[13px] font-sora text-left flex items-center justify-between gap-2 transition-colors ${
              open ? 'border-brand-cyan ring-1 ring-brand-cyan/20' : 'border-ltb hover:border-ltbl'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <span className="font-plex text-[12px] text-lttm shrink-0">{selected.code}</span>
                <span className="truncate text-ltt">{selected.name}</span>
              </span>
            ) : (
              <span className="text-lttm">{placeholder}</span>
            )}
            <Search size={13} className="text-lttm shrink-0" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-ltcard border border-ltb rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
              <div className="p-2 border-b border-ltb">
                <div className="flex items-center gap-2 bg-ltbg border border-ltb rounded-md px-2.5 py-1.5">
                  <Search size={12} className="text-lttm shrink-0" />
                  <input
                    autoFocus type="text" value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por código o nombre…"
                    className="flex-1 bg-transparent text-[12.5px] font-sora text-ltt outline-none placeholder:text-lttm"
                  />
                  {query && <button type="button" onClick={() => setQuery('')} className="text-lttm hover:text-ltt"><X size={11} /></button>}
                </div>
              </div>
              <ul className="overflow-y-auto max-h-[200px]">
                {filtered.length === 0 && (
                  <li className="px-3 py-3 text-[12.5px] font-sora text-lttm text-center">Sin resultados</li>
                )}
                {filtered.map(opt => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => { onChange(opt.id); setOpen(false); setQuery(''); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-ltbg ${opt.id === value ? 'bg-cyan-dim/60' : ''}`}
                    >
                      <span className="font-plex text-[11px] text-lttm w-[80px] shrink-0">{opt.code}</span>
                      <span className="flex-1 text-[12.5px] font-sora text-ltt line-clamp-1">{opt.name}</span>
                      {opt.id === value && <Check size={12} className="text-brand-cyan shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-1.5 border-t border-ltb bg-ltcard2">
                <span className="font-plex text-[10.5px] text-lttm">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const LEVELS = [
  { value: 'mandatory',    label: 'Obligatoria' },
  { value: 'recommended',  label: 'Recomendada' },
  { value: 'optional',     label: 'Opcional' },
];

const FRAMEWORKS: Record<string, string> = {
  AI_ACT: 'AI Act', ISO_42001: 'ISO 42001', RGPD: 'RGPD', DORA: 'DORA', ENS: 'ENS', MDR: 'MDR/IVDR',
};

function levelBadge(level: string) {
  const map: Record<string, string> = {
    mandatory:   'bg-red-dim border-reb text-re',
    recommended: 'bg-ordim border-orb text-or',
    optional:    'bg-grdim border-grb text-gr',
  };
  return map[level] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

function fwBadge(fw: string) {
  const map: Record<string, string> = {
    AI_ACT: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    ISO_42001: 'bg-grdim border-grb text-gr',
    RGPD: 'bg-ordim border-orb text-or',
    DORA: 'bg-red-dim border-reb text-re',
    ENS: 'bg-ltcard2 border-ltb text-ltt2',
    MDR: 'bg-ltcard2 border-ltb text-ltt2',
  };
  return map[fw] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

const emptyForm = { obligation_id: '', evidence_type_id: '', requirement_level: 'mandatory', notes: '' };

export default function ObligacionEvidenciaPage() {
  const [mounted, setMounted]         = useState(false);
  const [loading, setLoading]         = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [obligations, setObligations] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evidenceTypes, setEvidenceTypes] = useState<any[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(1);
  const [error, setError]             = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState(emptyForm);

  const pageSize = 100;

  useEffect(() => { setMounted(true); loadCatalogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCatalogs = async () => {
    const [oblRes, evtRes] = await Promise.all([getAllObligations(), getAllEvidenceTypes()]);
    if (oblRes.success && oblRes.data) setObligations(oblRes.data);
    if (evtRes.success && evtRes.data) setEvidenceTypes(evtRes.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getMappings(page, pageSize);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar correspondencias');
    }
    setLoading(false);
  };

  const handleDelete = async (oblId: string, evtId: string, label: string) => {
    if (!confirm(`¿Eliminar la correspondencia "${label}"?`)) return;
    const res = await deleteMapping(oblId, evtId);
    if (res.success) loadData();
    else alert('Error eliminando: ' + res.error);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm, obligation_id: obligations[0]?.id ?? '', evidence_type_id: evidenceTypes[0]?.id ?? '' });
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      obligation_id: item.obligation_id ?? item.obligations?.id,
      evidence_type_id: item.evidence_type_id ?? item.evidence_types?.id,
      requirement_level: item.requirement_level,
      notes: item.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingItem) {
      const oblId = editingItem.obligation_id ?? editingItem.obligations?.id;
      const evtId = editingItem.evidence_type_id ?? editingItem.evidence_types?.id;
      res = await updateMapping(oblId, evtId, {
        requirement_level: formData.requirement_level,
        notes: formData.notes || undefined,
      });
    } else {
      res = await createMapping({
        obligation_id: formData.obligation_id,
        evidence_type_id: formData.evidence_type_id,
        requirement_level: formData.requirement_level,
        notes: formData.notes || undefined,
      });
    }
    if (res.success) { setIsModalOpen(false); loadData(); }
    else alert('Error al guardar: ' + res.error);
    setSaving(false);
  };

  const visibleData = filterLevel ? data.filter(d => d.requirement_level === filterLevel) : data;

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Hero card */}
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-6">
        <Link href="/datos" className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4">
          <ArrowLeft size={13} />
          Volver a Datos
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Correspondencias · Obligación ↔ Evidencia</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Correspondencias: Obligación ↔ Evidencia</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Mapa global de qué tipos de evidencia son requeridos, recomendados u opcionales para cada obligación normativa.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Añadir Correspondencia
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div><span className="font-semibold block mb-0.5">Error de carga</span><span>{error}</span></div>
        </div>
      )}

      {/* Filtro nivel */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">Nivel:</span>
        {['', ...LEVELS.map(l => l.value)].map(lvl => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-3 py-1 rounded-full font-sora text-[12px] border transition-colors ${
              filterLevel === lvl
                ? 'bg-brand-cyan/10 border-cyan-border text-brand-cyan'
                : 'border-ltb text-ltt2 hover:border-ltbl hover:text-ltt'
            }`}
          >
            {lvl === '' ? 'Todos' : LEVELS.find(l => l.value === lvl)?.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center justify-between border-b border-ltb">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-lttm" />
            <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Correspondencias ({totalCount} registros)
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-ltcard3 border-b border-ltb font-plex text-[10.5px] uppercase tracking-wider text-lttm">
                <tr>
                  <th className="px-5 py-3 font-medium w-[120px]">Framework</th>
                  <th className="px-5 py-3 font-medium">Obligación</th>
                  <th className="px-5 py-3 font-medium">Tipo de Evidencia</th>
                  <th className="px-5 py-3 font-medium w-[130px]">Nivel</th>
                  <th className="px-5 py-3 font-medium">Notas</th>
                  <th className="px-5 py-3 font-medium text-right w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {visibleData.map(item => {
                  const obl = item.obligations;
                  const evt = item.evidence_types;
                  const oblId = item.obligation_id ?? obl?.id;
                  const evtId = item.evidence_type_id ?? evt?.id;
                  return (
                    <tr key={`${oblId}-${evtId}`} className="hover:bg-ltbg transition-colors group">
                      <td className="px-5 py-3.5">
                        {obl && (
                          <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex uppercase tracking-wide border ${fwBadge(obl.framework)}`}>
                            {FRAMEWORKS[obl.framework] ?? obl.framework}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{obl?.code}</div>
                        <div className="font-medium text-[13px] line-clamp-1">{obl?.title}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{evt?.code}</div>
                        <div className="text-[13px] line-clamp-1">{evt?.name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex border ${levelBadge(item.requirement_level)}`}>
                          {LEVELS.find(l => l.value === item.requirement_level)?.label ?? item.requirement_level}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-lttm text-[12.5px] max-w-[220px]">
                        <span className="line-clamp-2">{item.notes || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-md transition-colors" title="Editar">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(oblId, evtId, `${obl?.code} → ${evt?.code}`)} className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-md transition-colors" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ltt2 font-sora text-[13px]">
                      No se encontraron correspondencias
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalCount > pageSize && (
          <div className="p-4 border-t border-ltb flex items-center justify-between font-sora text-[13px] text-ltt2 bg-ltcard2">
            <span>Página {page} · {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} de {totalCount}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-ltb rounded-md hover:bg-ltbg disabled:opacity-50 transition-colors">Anterior</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= totalCount} className="px-3 py-1.5 border border-ltb rounded-md hover:bg-ltbg disabled:opacity-50 transition-colors">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-lg rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <h2 className="font-sora font-bold text-[17px] text-ltt">
                {editingItem ? 'Editar Correspondencia' : 'Nueva Correspondencia'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-lttm hover:text-ltt transition-colors rounded-md hover:bg-ltbg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="map-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <SearchableSelect
                  label="Obligación"
                  value={formData.obligation_id}
                  onChange={id => setFormData(p => ({ ...p, obligation_id: id }))}
                  options={obligations.map(o => ({ id: o.id, code: o.code, name: o.title }))}
                  placeholder="Busca una obligación…"
                  disabled={!!editingItem}
                />
                <SearchableSelect
                  label="Tipo de Evidencia"
                  value={formData.evidence_type_id}
                  onChange={id => setFormData(p => ({ ...p, evidence_type_id: id }))}
                  options={evidenceTypes.map(e => ({ id: e.id, code: e.code, name: e.name }))}
                  placeholder="Busca un tipo de evidencia…"
                  disabled={!!editingItem}
                />
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Nivel de requisito</label>
                  <select
                    value={formData.requirement_level} required
                    onChange={e => setFormData(p => ({ ...p, requirement_level: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Notas <span className="normal-case tracking-normal text-lttm">(opcional)</span></label>
                  <textarea
                    value={formData.notes} rows={3}
                    placeholder="Contexto adicional sobre esta correspondencia…"
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                  />
                </div>
                {editingItem && (
                  <p className="text-[12px] text-lttm font-sora">La obligación y el tipo de evidencia no se pueden cambiar. Si necesitas modificarlos, elimina esta correspondencia y crea una nueva.</p>
                )}
              </form>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="px-4 py-2 text-[13px] font-sora font-medium text-ltt2 hover:text-ltt transition-colors">
                Cancelar
              </button>
              <button type="submit" form="map-form" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
