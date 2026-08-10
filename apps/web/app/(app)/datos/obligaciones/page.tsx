'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert, X } from 'lucide-react';
import { getObligations, createObligation, updateObligation, deleteObligation } from './actions';

const FRAMEWORKS = [
  { value: 'AI_ACT',    label: 'AI Act' },
  { value: 'ISO_42001', label: 'ISO 42001' },
  { value: 'RGPD',      label: 'RGPD' },
  { value: 'DORA',      label: 'DORA' },
  { value: 'ENS',       label: 'ENS' },
  { value: 'MDR',       label: 'MDR/IVDR' },
];

const SCOPES = [
  { value: '',           label: 'Universal' },
  { value: 'high_risk',  label: 'Alto riesgo' },
  { value: 'gpai',       label: 'GPAI' },
  { value: 'general',    label: 'General' },
  { value: 'prohibited', label: 'Prohibido' },
];

function frameworkBadge(fw: string) {
  const map: Record<string, string> = {
    AI_ACT:    'bg-cyan-dim border-cyan-border text-brand-cyan',
    ISO_42001: 'bg-grdim border-grb text-gr',
    RGPD:      'bg-ordim border-orb text-or',
    DORA:      'bg-red-dim border-reb text-re',
    ENS:       'bg-ltcard2 border-ltb text-ltt2',
    MDR:       'bg-ltcard2 border-ltb text-ltt2',
  };
  return map[fw] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

function scopeBadge(scope: string | null) {
  if (!scope) return 'bg-ltcard2 border-ltb text-lttm';
  const map: Record<string, string> = {
    high_risk:  'bg-red-dim border-reb text-re',
    gpai:       'bg-ordim border-orb text-or',
    general:    'bg-grdim border-grb text-gr',
    prohibited: 'bg-red-dim border-reb text-re',
  };
  return map[scope] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

function scopeLabel(scope: string | null) {
  return SCOPES.find(s => s.value === (scope ?? ''))?.label ?? scope ?? '—';
}

const emptyForm = { code: '', framework: 'AI_ACT', article: '', title: '', description: '', scope: '' };

export default function ObligacionesPage() {
  const [mounted, setMounted]         = useState(false);
  const [loading, setLoading]         = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(1);
  const [error, setError]             = useState<string | null>(null);
  const [filterFw, setFilterFw]       = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState(emptyForm);

  const pageSize = 50;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadData(); }, [page, filterFw]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getObligations(page, pageSize, filterFw || undefined);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar obligaciones');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar la obligación ${code}?`)) return;
    const res = await deleteObligation(id);
    if (res.success) loadData();
    else alert('Error eliminando: ' + res.error);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code, framework: item.framework, article: item.article,
      title: item.title, description: item.description ?? '', scope: item.scope ?? '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, scope: formData.scope || null };
    const res = editingItem
      ? await updateObligation(editingItem.id, payload)
      : await createObligation(payload);
    if (res.success) { setIsModalOpen(false); loadData(); }
    else alert('Error al guardar: ' + res.error);
    setSaving(false);
  };

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
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Obligaciones</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Catálogo: Obligaciones</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Catálogo maestro de obligaciones normativas por framework. Sirve como base para mapear qué evidencias son requeridas por cada artículo o cláusula.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Añadir Obligación
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div><span className="font-semibold block mb-0.5">Error de carga</span><span>{error}</span></div>
        </div>
      )}

      {/* Filtro framework */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">Framework:</span>
        {['', ...FRAMEWORKS.map(f => f.value)].map(fw => (
          <button
            key={fw}
            onClick={() => { setFilterFw(fw); setPage(1); }}
            className={`px-3 py-1 rounded-full font-sora text-[12px] border transition-colors ${
              filterFw === fw
                ? 'bg-brand-cyan/10 border-cyan-border text-brand-cyan'
                : 'border-ltb text-ltt2 hover:border-ltbl hover:text-ltt'
            }`}
          >
            {fw === '' ? 'Todos' : FRAMEWORKS.find(f => f.value === fw)?.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center justify-between border-b border-ltb">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-lttm" />
            <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Obligaciones ({totalCount} registros)
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
                  <th className="px-5 py-3 font-medium w-[140px]">Código</th>
                  <th className="px-5 py-3 font-medium w-[120px]">Framework</th>
                  <th className="px-5 py-3 font-medium w-[120px]">Artículo</th>
                  <th className="px-5 py-3 font-medium">Título</th>
                  <th className="px-5 py-3 font-medium w-[110px]">Ámbito</th>
                  <th className="px-5 py-3 font-medium text-right w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-ltbg transition-colors group">
                    <td className="px-5 py-3.5 font-plex text-[12px] text-ltt2">{item.code}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex uppercase tracking-wide border ${frameworkBadge(item.framework)}`}>
                        {FRAMEWORKS.find(f => f.value === item.framework)?.label ?? item.framework}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-plex text-[13px] text-ltt2">{item.article}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium line-clamp-2">{item.title}</div>
                      {item.description && (
                        <div className="text-[11.5px] text-lttm mt-0.5 line-clamp-1">{item.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex border ${scopeBadge(item.scope)}`}>
                        {scopeLabel(item.scope)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-md transition-colors" title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.code)} className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-md transition-colors" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ltt2 font-sora text-[13px]">
                      No se encontraron obligaciones
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
          <div className="bg-ltcard w-full max-w-xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <h2 className="font-sora font-bold text-[17px] text-ltt">
                {editingItem ? 'Editar Obligación' : 'Nueva Obligación'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-lttm hover:text-ltt transition-colors rounded-md hover:bg-ltbg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="obl-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Código único</label>
                    <input
                      type="text" value={formData.code} required placeholder="Ej: AI-ACT-ART9"
                      onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Framework</label>
                    <select
                      value={formData.framework} required
                      onChange={e => setFormData(p => ({ ...p, framework: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    >
                      {FRAMEWORKS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Artículo / Cláusula</label>
                    <input
                      type="text" value={formData.article} required placeholder="Ej: Art. 9"
                      onChange={e => setFormData(p => ({ ...p, article: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Ámbito</label>
                    <select
                      value={formData.scope}
                      onChange={e => setFormData(p => ({ ...p, scope: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    >
                      {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Título</label>
                  <input
                    type="text" value={formData.title} required placeholder="Ej: Sistema de gestión de riesgos"
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Descripción</label>
                  <textarea
                    value={formData.description} rows={3}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="px-4 py-2 text-[13px] font-sora font-medium text-ltt2 hover:text-ltt transition-colors">
                Cancelar
              </button>
              <button type="submit" form="obl-form" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
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
