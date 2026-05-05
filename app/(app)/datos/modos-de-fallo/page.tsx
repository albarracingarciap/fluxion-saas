'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Loader2, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { getFailureModes, deleteFailureMode, getRiskDimensions, createFailureMode, updateFailureMode } from './actions';

export default function ModosDeFalloPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    dimension_id: '',
    bloque: '',
    subcategoria: '',
    tipo: 'Producto',
    r_value: 0,
    i_value: 0,
    d_value: 0,
    e_value: 0,
    w_calculated: 0,
    s_default: 2,
  });

  const pageSize = 50;

  useEffect(() => {
    setMounted(true);
    loadData();
    loadDimensions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    const res = await getFailureModes(page, pageSize);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar modos de fallo');
    }
    setLoading(false);
  };

  const loadDimensions = async () => {
    const res = await getRiskDimensions();
    if (res.success && res.data) {
      setDimensions(res.data);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el modo de fallo ${code}?`)) return;
    const res = await deleteFailureMode(id);
    if (res.success) {
      loadData();
    } else {
      alert('Error eliminando: ' + res.error);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      code: '', name: '', description: '', dimension_id: dimensions[0]?.id || '',
      bloque: '', subcategoria: '', tipo: 'Producto', r_value: 0, i_value: 0, d_value: 0, e_value: 0, w_calculated: 0, s_default: 2
    });
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const calculateW = (r: number, i: number, d: number, e: number) => {
    return parseFloat(((r + i + d + e) / 4).toFixed(2));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | number = value;
    
    if (type === 'number') {
      finalValue = Number(value);
    }
    
    setFormData(prev => {
      const next = { ...prev, [name]: finalValue };
      if (['r_value', 'i_value', 'd_value', 'e_value'].includes(name)) {
        next.w_calculated = calculateW(next.r_value, next.i_value, next.d_value, next.e_value);
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;

    // Remover properties anidadas antes de guardar
    const payload = { ...formData };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (payload as any).risk_dimensions; 

    if (editingItem) {
      res = await updateFailureMode(editingItem.id, payload);
    } else {
      res = await createFailureMode(payload);
    }

    if (res.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      alert('Error al guardar: ' + res.error);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-6">
        <Link
          href="/datos"
          className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Volver a Datos
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Modos de Fallo</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Catálogo: Modos de Fallo</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Administra el inventario de vectores de riesgo, metodologías R.I.D.E. y dimensiones. Todos los tenants del sistema consumen en modo lectura de este catálogo maestro.
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
          >
            <Plus className="w-4 h-4" />
            Añadir Nuevo
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start space-x-2 bg-red-dim border border-reb text-re text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block mb-0.5">Error de carga</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="bg-ltcard2 px-6 py-4 flex items-center justify-between border-b border-ltb">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-lttm" />
            <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Trazabilidad ({totalCount} registros)
            </h2>
          </div>
          {/* Aquí cabría un campo de búsqueda en el futuro */}
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
                  <th className="px-5 py-3 font-medium min-w-[100px]">Código</th>
                  <th className="px-5 py-3 font-medium min-w-[120px]">Dimensión</th>
                  <th className="px-5 py-3 font-medium">Modo de Fallo</th>
                  <th className="px-5 py-3 font-medium text-center w-12">R</th>
                  <th className="px-5 py-3 font-medium text-center w-12">I</th>
                  <th className="px-5 py-3 font-medium text-center w-12">D</th>
                  <th className="px-5 py-3 font-medium text-center w-12">E</th>
                  <th className="px-5 py-3 font-medium text-center w-16">S. Def</th>
                  <th className="px-5 py-3 font-medium text-right min-w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-ltbg transition-colors group">
                    <td className="px-5 py-3.5 font-plex text-[12px]">{item.code}</td>
                    <td className="px-5 py-3.5">
                       <span className="bg-cyan-dim border border-cyan-border text-brand-cyan px-2 py-1 rounded-[4px] text-[11px] font-plex uppercase tracking-wide">
                         {item.risk_dimensions?.name || item.dimension_id}
                       </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="line-clamp-2" title={item.name}>{item.name}</div>
                      <div className="text-[11px] text-lttm mt-0.5 line-clamp-1">{item.bloque} / {item.subcategoria}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">{item.r_value}</td>
                    <td className="px-5 py-3.5 text-center">{item.i_value}</td>
                    <td className="px-5 py-3.5 text-center">{item.d_value}</td>
                    <td className="px-5 py-3.5 text-center">{item.e_value}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-ltt2">{item.s_default}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-md transition-colors" title="Editar">
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
                    <td colSpan={9} className="px-5 py-8 text-center text-ltt2">
                      No se encontraron resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && totalCount > pageSize && (
          <div className="p-4 border-t border-ltb flex items-center justify-between font-sora text-[13px] text-ltt2 bg-ltcard2">
            <div>
              Mostrando página {page} ({(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount})
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-ltb rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1.5 border border-ltb rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Añadir / Editar */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-2xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <h2 className="font-sora font-bold text-[17px] text-ltt">
                {editingItem ? 'Editar Modo de Fallo' : 'Añadir Modo de Fallo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-lttm hover:text-ltt">x</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="fmea-form" onSubmit={handleSave} className="grid grid-cols-2 gap-x-5 gap-y-4">
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Código Único</label>
                  <input type="text" name="code" value={formData.code} onChange={handleFormChange} required placeholder="Ej: TEC-001" className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Dimensión</label>
                  <select name="dimension_id" value={formData.dimension_id} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan">
                    <option value="">Selecciona...</option>
                    {dimensions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Nombre / Modo de Fallo</label>
                  <textarea name="name" value={formData.name} onChange={handleFormChange} required rows={2} className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none" />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Bloque</label>
                  <input type="text" name="bloque" value={formData.bloque} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan" />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Subcategoría</label>
                  <input type="text" name="subcategoria" value={formData.subcategoria} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan" />
                </div>

                <div className="col-span-full border-t border-ltb pt-4 mt-2">
                  <h3 className="font-plex text-[11px] uppercase text-ltt font-semibold mb-3">Métricas de Riesgo (R.I.D.E.)</h3>
                </div>

                <div className="col-span-2 grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5 text-center">Risk (R)</label>
                    <input type="number" name="r_value" min="0" max="3" value={formData.r_value} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-2 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan text-center" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5 text-center">Impact (I)</label>
                    <input type="number" name="i_value" min="0" max="3" value={formData.i_value} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-2 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan text-center" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5 text-center">Detec. (D)</label>
                    <input type="number" name="d_value" min="0" max="3" value={formData.d_value} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-2 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan text-center" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5 text-center">Exp. (E)</label>
                    <input type="number" name="e_value" min="0" max="3" value={formData.e_value} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-2 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan text-center" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5 text-center">S. Defecto</label>
                    <input type="number" name="s_default" min="2" max="9" value={formData.s_default} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-2 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan text-center" />
                  </div>
                </div>

                <div className="col-span-2 pt-2 flex items-center justify-between">
                   <div className="text-[12px] font-sora text-ltt2">
                     Peso W Calculado Automáticamente: <strong className="text-ltt">{formData.w_calculated}</strong>
                   </div>
                </div>

              </form>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[13px] font-sora font-medium text-ltt2 hover:text-ltt transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="fmea-form"
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
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
