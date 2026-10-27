'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert, X, Search, Check } from 'lucide-react';
import { getMappings, getAllControlTemplates, createMapping, updateMapping, deleteMapping } from './actions';
import { ISO_42001_CONTROLS } from '@/lib/templates/iso42001-catalog';
import { canEditCatalogs } from '../../actions';

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

const CONFIANZAS = [
  { value: 'alta',  label: 'Alta',  hint: 'La plantilla es esencialmente el control' },
  { value: 'media', label: 'Media', hint: 'La plantilla cubre el control en parte' },
];

function confianzaBadge(c: string) {
  return c === 'alta' ? 'bg-grdim border-grb text-gr' : 'bg-ordim border-orb text-or';
}

type Fila = {
  template_id: string
  soa_control_code: string
  confidence: string
  control_templates: { id: string; code: string; title: string } | { id: string; code: string; title: string }[] | null
}

const plantillaDe = (f: Fila) => (Array.isArray(f.control_templates) ? f.control_templates[0] : f.control_templates) ?? null;
const anexoA = new Map(ISO_42001_CONTROLS.map((c) => [c.id, c]));
const emptyForm = { template_id: '', soa_control_code: '', confidence: 'media' };

export default function PlantillaAnexoAPage() {
  const [mounted, setMounted]     = useState(false);
  // Solo la administración de la plataforma modifica los catálogos (lib/auth/platform.ts).
  const [canEdit, setCanEdit]     = useState(false);
  useEffect(() => { canEditCatalogs().then(setCanEdit); }, []);
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState<Fila[]>([]);
  const [templates, setTemplates] = useState<{ id: string; code: string; title: string }[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [filterConf, setFilterConf] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Fila | null>(null);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState(emptyForm);

  useEffect(() => { setMounted(true); loadTemplates(); loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplates = async () => {
    const res = await getAllControlTemplates();
    if (res.success && res.data) setTemplates(res.data);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getMappings();
    if (res.success && res.data) setData(res.data as unknown as Fila[]);
    else setError(res.error || 'Error al cargar correspondencias');
    setLoading(false);
  };

  const handleDelete = async (item: Fila) => {
    const label = `${plantillaDe(item)?.code ?? ''} → ${item.soa_control_code}`;
    if (!confirm(`¿Eliminar la correspondencia "${label}"?`)) return;
    const res = await deleteMapping(item.template_id, item.soa_control_code);
    if (res.success) loadData();
    else alert('Error eliminando: ' + res.error);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm, template_id: templates[0]?.id ?? '', soa_control_code: ISO_42001_CONTROLS[0]?.id ?? '' });
    setIsModalOpen(true);
  };

  const openEdit = (item: Fila) => {
    setEditingItem(item);
    setFormData({ template_id: item.template_id, soa_control_code: item.soa_control_code, confidence: item.confidence });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = editingItem
      ? await updateMapping(editingItem.template_id, editingItem.soa_control_code, formData.confidence)
      : await createMapping(formData);
    if (res.success) { setIsModalOpen(false); loadData(); }
    else alert('Error al guardar: ' + res.error);
    setSaving(false);
  };

  const visibleData = filterConf ? data.filter(d => d.confidence === filterConf) : data;
  const plantillasConCorrespondencia = new Set(data.map(d => d.template_id)).size;

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-6">
        <Link href="/datos" className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4">
          <ArrowLeft size={13} />
          Volver a Datos
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Correspondencias · Plantilla ↔ Anexo A</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Correspondencias: Plantilla ↔ Anexo A</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Qué controles del Anexo A de la ISO/IEC 42001 cubre cada plantilla de control. Cuando todos los sistemas vinculados a un control
              de la Declaración de Aplicabilidad lo tienen implantado en su plan de tratamiento, con evidencia válida, la Declaración propone «Implantado».
            </p>
          </div>
          {canEdit && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Añadir Correspondencia
          </button>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div><span className="font-semibold block mb-0.5">Error de carga</span><span>{error}</span></div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">Confianza:</span>
        {['', ...CONFIANZAS.map(c => c.value)].map(c => (
          <button
            key={c}
            onClick={() => setFilterConf(c)}
            className={`px-3 py-1 rounded-full font-sora text-[12px] border transition-colors ${
              filterConf === c
                ? 'bg-brand-cyan/10 border-cyan-border text-brand-cyan'
                : 'border-ltb text-ltt2 hover:border-ltbl hover:text-ltt'
            }`}
          >
            {c === '' ? 'Todas' : CONFIANZAS.find(x => x.value === c)?.label}
          </button>
        ))}
      </div>

      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center justify-between border-b border-ltb">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-lttm" />
            <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Correspondencias ({data.length} registros · {plantillasConCorrespondencia} plantillas)
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
                  <th className="px-5 py-3 font-medium">Control del Anexo A</th>
                  <th className="px-5 py-3 font-medium">Plantilla de control</th>
                  <th className="px-5 py-3 font-medium w-[120px]">Confianza</th>
                  <th className="px-5 py-3 font-medium text-right w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {visibleData.map(item => {
                  const tpl = plantillaDe(item);
                  const ctl = anexoA.get(item.soa_control_code);
                  return (
                    <tr key={`${item.template_id}-${item.soa_control_code}`} className="hover:bg-ltbg transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{item.soa_control_code}</div>
                        <div className="font-medium text-[13px] line-clamp-1">{ctl?.title ?? '—'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-plex text-[12px] text-lttm">{tpl?.code}</div>
                        <div className="text-[13px] line-clamp-1">{tpl?.title}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex border ${confianzaBadge(item.confidence)}`}>
                          {CONFIANZAS.find(c => c.value === item.confidence)?.label ?? item.confidence}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {canEdit && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-md transition-colors" title="Editar">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(item)} className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-md transition-colors" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-ltt2 font-sora text-[13px]">
                      No se encontraron correspondencias
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  label="Plantilla de control"
                  value={formData.template_id}
                  onChange={id => setFormData(p => ({ ...p, template_id: id }))}
                  options={templates.map(t => ({ id: t.id, code: t.code, name: t.title }))}
                  placeholder="Busca una plantilla…"
                  disabled={!!editingItem}
                />
                <SearchableSelect
                  label="Control del Anexo A"
                  value={formData.soa_control_code}
                  onChange={id => setFormData(p => ({ ...p, soa_control_code: id }))}
                  options={ISO_42001_CONTROLS.map(c => ({ id: c.id, code: c.id, name: c.title }))}
                  placeholder="Busca un control del Anexo A…"
                  disabled={!!editingItem}
                />
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Confianza</label>
                  <select
                    value={formData.confidence} required
                    onChange={e => setFormData(p => ({ ...p, confidence: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    {CONFIANZAS.map(c => <option key={c.value} value={c.value}>{c.label} · {c.hint}</option>)}
                  </select>
                </div>
                {editingItem && (
                  <p className="text-[12px] text-lttm font-sora">La plantilla y el control no se pueden cambiar. Si necesitas modificarlos, elimina esta correspondencia y crea una nueva.</p>
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
