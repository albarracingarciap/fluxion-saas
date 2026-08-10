'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert, X } from 'lucide-react';
import { getControlTemplates, createControlTemplate, updateControlTemplate, deleteControlTemplate } from './actions';

const CATEGORIES = [
  { value: 'documentation', label: 'Documentación' },
  { value: 'technical',     label: 'Técnica' },
  { value: 'monitoring',    label: 'Monitorización' },
  { value: 'governance',    label: 'Gobernanza' },
  { value: 'process',       label: 'Proceso' },
  { value: 'training',      label: 'Formación' },
];

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    documentation: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    technical:     'bg-brand-blue/10 border-brand-blue/20 text-brand-blue',
    monitoring:    'bg-ordim border-orb text-or',
    governance:    'bg-grdim border-grb text-gr',
    process:       'bg-ltcard2 border-ltb text-ltt2',
    training:      'bg-red-dim border-reb text-re',
  };
  return map[cat] ?? 'bg-ltcard2 border-ltb text-ltt2';
}

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

const emptyForm = {
  code: '', title: '', description: '', category: 'documentation',
  guidance: '', tags: '', is_active: true,
};

export default function MedidasPage() {
  const [mounted, setMounted]         = useState(false);
  const [loading, setLoading]         = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(1);
  const [error, setError]             = useState<string | null>(null);
  const [filterCat, setFilterCat]     = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState(emptyForm);

  const pageSize = 50;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadData(); }, [page, filterCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getControlTemplates(page, pageSize, filterCat || undefined);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar medidas de control');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar la medida ${code}?`)) return;
    const res = await deleteControlTemplate(id);
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
      code:        item.code,
      title:       item.title,
      description: item.description ?? '',
      category:    item.category ?? 'documentation',
      guidance:    item.guidance ?? '',
      tags:        Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags ?? ''),
      is_active:   item.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const tagsArray = formData.tags
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const payload = { ...formData, tags: tagsArray };
    const res = editingItem
      ? await updateControlTemplate(editingItem.id, payload)
      : await createControlTemplate(payload);
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
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Medidas de Control</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Catálogo: Medidas de Control</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Plantillas de medidas de control y mitigación disponibles para vincular a modos de fallo. Todos los tenants consumen este catálogo en modo lectura.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Añadir Medida
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div><span className="font-semibold block mb-0.5">Error de carga</span><span>{error}</span></div>
        </div>
      )}

      {/* Filtro categoría */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">Categoría:</span>
        {['', ...CATEGORIES.map(c => c.value)].map(cat => (
          <button
            key={cat}
            onClick={() => { setFilterCat(cat); setPage(1); }}
            className={`px-3 py-1 rounded-full font-sora text-[12px] border transition-colors ${
              filterCat === cat
                ? 'bg-brand-cyan/10 border-cyan-border text-brand-cyan'
                : 'border-ltb text-ltt2 hover:border-ltbl hover:text-ltt'
            }`}
          >
            {cat === '' ? 'Todas' : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center border-b border-ltb gap-2">
          <Database className="w-4 h-4 text-lttm" />
          <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
            Medidas de Control ({totalCount} registros)
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
                  <th className="px-5 py-3 font-medium w-[110px]">Código</th>
                  <th className="px-5 py-3 font-medium w-[140px]">Categoría</th>
                  <th className="px-5 py-3 font-medium">Título</th>
                  <th className="px-5 py-3 font-medium">Referencias normativas</th>
                  <th className="px-5 py-3 font-medium w-[80px] text-center">Activa</th>
                  <th className="px-5 py-3 font-medium text-right w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {data.map(item => {
                  const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
                  return (
                    <tr key={item.id} className="hover:bg-ltbg transition-colors group">
                      <td className="px-5 py-3.5 font-plex text-[12px] text-ltt2">{item.code}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-plex uppercase tracking-wide border ${categoryBadge(item.category)}`}>
                          {categoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium line-clamp-1">{item.title}</div>
                        {item.description && (
                          <div className="text-[11.5px] text-lttm mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 4).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-ltcard2 border border-ltb rounded-[4px] font-plex text-[10.5px] text-lttm">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 4 && (
                            <span className="font-plex text-[10.5px] text-lttm">+{tags.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${item.is_active ? 'bg-gr' : 'bg-ltbl'}`} />
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
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ltt2 font-sora text-[13px]">
                      No se encontraron medidas de control
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
                {editingItem ? 'Editar Medida de Control' : 'Nueva Medida de Control'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-lttm hover:text-ltt transition-colors rounded-md hover:bg-ltbg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="ctl-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Código único</label>
                    <input
                      type="text" value={formData.code} required placeholder="Ej: CTL-060"
                      onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Categoría</label>
                    <select
                      value={formData.category} required
                      onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    >
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Título</label>
                  <input
                    type="text" value={formData.title} required
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Descripción</label>
                  <textarea
                    value={formData.description} rows={2}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Guía de implementación</label>
                  <textarea
                    value={formData.guidance} rows={3}
                    onChange={e => setFormData(p => ({ ...p, guidance: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    Referencias normativas <span className="normal-case tracking-normal text-lttm">(separadas por coma)</span>
                  </label>
                  <input
                    type="text" value={formData.tags}
                    placeholder="Ej: Art. 9 AI Act, ISO A.6.1"
                    onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                      className={`w-[36px] h-[20px] rounded-full relative shrink-0 transition-colors cursor-pointer ${formData.is_active ? 'bg-brand-cyan' : 'bg-ltbl'}`}
                    >
                      <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${formData.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </div>
                    <span className="font-sora text-[13px] text-ltt">Medida activa</span>
                  </label>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="px-4 py-2 text-[13px] font-sora font-medium text-ltt2 hover:text-ltt transition-colors">
                Cancelar
              </button>
              <button type="submit" form="ctl-form" disabled={saving} className="px-5 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
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
