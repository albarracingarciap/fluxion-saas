'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert, X, Search, Check } from 'lucide-react';
import { getModeMappings, getAllFailureModes, getAllControlTemplates, createModeMapping, updateModeMapping, deleteModeMapping } from './actions';

// ── Searchable select ──────────────────────────────────────────────────────────
function SearchableSelect({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  options: { id: string; code: string; name: string; sub?: string }[]
  placeholder: string
  disabled?: boolean
}) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.id === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.code.toLowerCase().includes(query.toLowerCase()) ||
        o.name.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">{label}</label>

      {disabled && selected ? (
        <div className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora text-ltt opacity-60 flex gap-2">
          <span className="font-plex text-lttm">{selected.code}</span>
          <span className="truncate">{selected.name}</span>
        </div>
      ) : (
        <>
          {/* Trigger */}
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

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-ltcard border border-ltb rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
              <div className="p-2 border-b border-ltb">
                <div className="flex items-center gap-2 bg-ltbg border border-ltb rounded-md px-2.5 py-1.5">
                  <Search size={12} className="text-lttm shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por código o nombre…"
                    className="flex-1 bg-transparent text-[12.5px] font-sora text-ltt outline-none placeholder:text-lttm"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="text-lttm hover:text-ltt">
                      <X size={11} />
                    </button>
                  )}
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
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-ltbg ${
                        opt.id === value ? 'bg-cyan-dim/60' : ''
                      }`}
                    >
                      <span className="font-plex text-[11px] text-lttm w-[72px] shrink-0">{opt.code}</span>
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

const DIMENSIONS: Record<string, string> = {
  tecnica:    'TEC',
  seguridad:  'SEG',
  etica:      'ETH',
  gobernanza: 'GOV',
  roi:        'ROI',
  legal_b:    'LEG',
};

function dimBadge(dimId: string) {
  const map: Record<string, string> = {
    tecnica:    'bg-brand-blue/10 border-brand-blue/20 text-brand-blue',
    seguridad:  'bg-red-dim border-reb text-re',
    etica:      'bg-ordim border-orb text-or',
    gobernanza: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    roi:        'bg-grdim border-grb text-gr',
    legal_b:    'bg-ltcard2 border-ltb text-ltt2',
  };
  return map[dimId] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

const emptyForm = { failure_mode_id: '', control_template_id: '', is_primary: true };

export default function ModoMedidaPage() {
  const [mounted, setMounted]             = useState(false);
  const [loading, setLoading]             = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]                   = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [failureModes, setFailureModes]   = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [controls, setControls]           = useState<any[]>([]);
  const [totalCount, setTotalCount]       = useState(0);
  const [page, setPage]                   = useState(1);
  const [error, setError]                 = useState<string | null>(null);
  const [filterPrimary, setFilterPrimary] = useState<string>('');

  const [isModalOpen, setIsModalOpen]     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem]     = useState<any>(null);
  const [saving, setSaving]               = useState(false);
  const [formData, setFormData]           = useState(emptyForm);

  const pageSize = 100;

  useEffect(() => { setMounted(true); loadCatalogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCatalogs = async () => {
    const [fmRes, ctRes] = await Promise.all([getAllFailureModes(), getAllControlTemplates()]);
    if (fmRes.success && fmRes.data) setFailureModes(fmRes.data);
    if (ctRes.success && ctRes.data) setControls(ctRes.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getModeMappings(page, pageSize);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar correspondencias');
    }
    setLoading(false);
  };

  const handleDelete = async (fmId: string, ctId: string, label: string) => {
    if (!confirm(`¿Eliminar la correspondencia "${label}"?`)) return;
    const res = await deleteModeMapping(fmId, ctId);
    if (res.success) loadData();
    else alert('Error eliminando: ' + res.error);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm, failure_mode_id: failureModes[0]?.id ?? '', control_template_id: controls[0]?.id ?? '' });
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      failure_mode_id:    item.failure_mode_id ?? item.failure_modes?.id,
      control_template_id: item.control_template_id ?? item.control_templates?.id,
      is_primary:         item.is_primary,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editingItem) {
      const fmId = editingItem.failure_mode_id ?? editingItem.failure_modes?.id;
      const ctId = editingItem.control_template_id ?? editingItem.control_templates?.id;
      res = await updateModeMapping(fmId, ctId, { is_primary: formData.is_primary });
    } else {
      res = await createModeMapping({
        failure_mode_id:     formData.failure_mode_id,
        control_template_id: formData.control_template_id,
        is_primary:          formData.is_primary,
      });
    }
    if (res.success) { setIsModalOpen(false); loadData(); }
    else alert('Error al guardar: ' + res.error);
    setSaving(false);
  };

  const visibleData = filterPrimary !== ''
    ? data.filter(d => String(d.is_primary) === filterPrimary)
    : data;

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
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Correspondencias · Modo ↔ Medida</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Correspondencias: Modo ↔ Medida</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Mapa global de qué medidas de control mitigan cada modo de fallo. Las medidas primarias son la mitigación principal recomendada.
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

      {/* Filtro tipo */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">Tipo:</span>
        {[
          { value: '',     label: 'Todas' },
          { value: 'true', label: 'Primaria' },
          { value: 'false', label: 'Secundaria' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterPrimary(opt.value)}
            className={`px-3 py-1 rounded-full font-sora text-[12px] border transition-colors ${
              filterPrimary === opt.value
                ? 'bg-brand-cyan/10 border-cyan-border text-brand-cyan'
                : 'border-ltb text-ltt2 hover:border-ltbl hover:text-ltt'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center border-b border-ltb gap-2">
          <Database className="w-4 h-4 text-lttm" />
          <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
            Correspondencias ({totalCount} registros)
          </h2>
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
                  <th className="px-5 py-3 font-medium w-[90px]">Dim.</th>
                  <th className="px-5 py-3 font-medium">Modo de Fallo</th>
                  <th className="px-5 py-3 font-medium">Medida de Control</th>
                  <th className="px-5 py-3 font-medium w-[110px] text-center">Tipo</th>
                  <th className="px-5 py-3 font-medium text-right w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {visibleData.map(item => {
                  const fm = item.failure_modes;
                  const ct = item.control_templates;
                  const fmId = item.failure_mode_id ?? fm?.id;
                  const ctId = item.control_template_id ?? ct?.id;
                  return (
                    <tr key={`${fmId}-${ctId}`} className="hover:bg-ltbg transition-colors group">
                      <td className="px-5 py-3.5">
                        {fm && (
                          <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex uppercase tracking-wide border ${dimBadge(fm.dimension_id)}`}>
                            {DIMENSIONS[fm.dimension_id] ?? fm.dimension_id}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{fm?.code}</div>
                        <div className="font-medium text-[13px] line-clamp-1">{fm?.name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{ct?.code}</div>
                        <div className="text-[13px] line-clamp-1">{ct?.title}</div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex border ${
                          item.is_primary
                            ? 'bg-cyan-dim border-cyan-border text-brand-cyan'
                            : 'bg-ltcard2 border-ltb text-ltt2'
                        }`}>
                          {item.is_primary ? 'Primaria' : 'Secundaria'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-md transition-colors" title="Editar">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(fmId, ctId, `${fm?.code} → ${ct?.code}`)} className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-md transition-colors" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ltt2 font-sora text-[13px]">
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
              <form id="mm-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <SearchableSelect
                  label="Modo de Fallo"
                  value={formData.failure_mode_id}
                  onChange={id => setFormData(p => ({ ...p, failure_mode_id: id }))}
                  options={failureModes.map(fm => ({ id: fm.id, code: fm.code, name: fm.name }))}
                  placeholder="Busca un modo de fallo…"
                  disabled={!!editingItem}
                />
                <SearchableSelect
                  label="Medida de Control"
                  value={formData.control_template_id}
                  onChange={id => setFormData(p => ({ ...p, control_template_id: id }))}
                  options={controls.map(ct => ({ id: ct.id, code: ct.code, name: ct.title }))}
                  placeholder="Busca una medida…"
                  disabled={!!editingItem}
                />
                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setFormData(p => ({ ...p, is_primary: !p.is_primary }))}
                      className={`w-[36px] h-[20px] rounded-full relative shrink-0 transition-colors cursor-pointer ${formData.is_primary ? 'bg-brand-cyan' : 'bg-ltbl'}`}
                    >
                      <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${formData.is_primary ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </div>
                    <div>
                      <div className="font-sora text-[13px] text-ltt">Mitigación primaria</div>
                      <div className="font-sora text-[11.5px] text-lttm">Es la medida de control principal recomendada para este modo de fallo</div>
                    </div>
                  </label>
                </div>
                {editingItem && (
                  <p className="text-[12px] text-lttm font-sora">El modo de fallo y la medida no se pueden cambiar. Elimina esta correspondencia y crea una nueva si necesitas modificarlos.</p>
                )}
              </form>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="px-4 py-2 text-[13px] font-sora font-medium text-ltt2 hover:text-ltt transition-colors">
                Cancelar
              </button>
              <button type="submit" form="mm-form" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
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
