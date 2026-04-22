'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Network, Plus, Loader2, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { 
  getCausalRelationships, 
  deleteCausalRelationship, 
  getCausalFamilies, 
  getCausalNodes, 
  createCausalRelationship, 
  updateCausalRelationship 
} from './actions';

export default function RelacionesCausalesPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '', 
    family_id: '',
    source_node_id: '',
    target_node_id: '',
    type: 'causes',
    explanatory_mechanism: '',
    activation_condition: '',
    confidence: 'high',
  });

  const pageSize = 50;

  useEffect(() => {
    setMounted(true);
    loadData();
    if (families.length === 0) loadCatalogs();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    const res = await getCausalRelationships(page, pageSize);
    if (res.success && res.data) {
      setData(res.data);
      setTotalCount(res.count || 0);
    } else {
      setError(res.error || 'Error al cargar relaciones causales');
    }
    setLoading(false);
  };

  const loadCatalogs = async () => {
    const resFam = await getCausalFamilies();
    if (resFam.success && resFam.data) setFamilies(resFam.data);

    const resNod = await getCausalNodes();
    if (resNod.success && resNod.data) setNodes(resNod.data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la relación ${id}?`)) return;
    const res = await deleteCausalRelationship(id);
    if (res.success) {
      loadData();
    } else {
      alert('Error eliminando: ' + res.error);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      id: '', family_id: '', source_node_id: '', target_node_id: '', type: 'causes',
      explanatory_mechanism: '', activation_condition: '', confidence: 'high'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ 
      id: item.id, 
      family_id: item.family_id, 
      source_node_id: item.source_node_id, 
      target_node_id: item.target_node_id, 
      type: item.type,
      explanatory_mechanism: item.explanatory_mechanism,
      activation_condition: item.activation_condition,
      confidence: item.confidence
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;

    if (editingItem) {
      const payload = { ...formData };
      delete (payload as any).id; 
      res = await updateCausalRelationship(editingItem.id, payload);
    } else {
      res = await createCausalRelationship(formData);
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
    <div className="max-w-7xl w-full mx-auto animate-fadein pb-10">
      
      {/* Breadcrumb section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider">
          <Link href="/datos" className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
            <ArrowLeft size={14} className="text-lttm" />
            <span>Base de Datos</span>
          </Link>
          <span className="text-lttm">/</span>
          <span className="text-ltt font-medium">Relaciones Causales</span>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] border-none"
        >
          <Plus className="w-4 h-4" />
          Añadir Nueva
        </button>
      </div>

      <div className="mb-6">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
          Catálogo: Relaciones Causales
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed max-w-3xl">
          Administra el inventario de grafos, relaciones causa-efecto, activadores y mecanismos de propagación del modelo.
        </p>
      </div>

      {error && (
        <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-600 text-[13px] font-sora p-4 rounded-lg mb-6">
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
            <Network className="w-4 h-4 text-lttm" />
            <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Grafo ({totalCount} aristas)
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
                  <th className="px-5 py-3 font-medium min-w-[70px]">ID</th>
                  <th className="px-5 py-3 font-medium min-w-[120px]">Origen</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium min-w-[120px]">Destino</th>
                  <th className="px-5 py-3 font-medium">Mecanismo / Condición</th>
                  <th className="px-5 py-3 font-medium min-w-[80px]">Conf.</th>
                  <th className="px-5 py-3 font-medium text-right min-w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ltb text-[13px] font-sora text-ltt">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-ltbg transition-colors group">
                    <td className="px-5 py-3.5 font-plex text-[12px] whitespace-nowrap">{item.id}</td>
                    <td className="px-5 py-3.5">
                       <span className="bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-plex mr-1">
                         [{item.source_domain}]
                       </span>
                       <span className="line-clamp-2" title={item.source_name}>{item.source_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                        <span className={`px-2 py-1 rounded-[4px] text-[11px] font-plex uppercase tracking-wide
                           ${item.type === 'causes' ? 'bg-red-50 text-red-600' : 
                             item.type === 'amplifies' ? 'bg-orange-50 text-orange-600' :
                             item.type === 'correlates' ? 'bg-purple-50 text-purple-600' :
                             'bg-emerald-50 text-emerald-600'}`}>
                           {item.type}
                        </span>
                    </td>
                    <td className="px-5 py-3.5">
                       <span className="bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-plex mr-1">
                         [{item.target_domain}]
                       </span>
                       <span className="line-clamp-2" title={item.target_name}>{item.target_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="line-clamp-1 italic text-ltt2 text-xs" title={item.explanatory_mechanism}>{item.explanatory_mechanism}</div>
                      <div className="text-[11px] text-lttm mt-0.5 line-clamp-1" title={item.activation_condition}>📍 {item.activation_condition}</div>
                    </td>
                    <td className="px-5 py-3.5">
                       <span className="font-plex text-xs uppercase tracking-wider text-lttm">{item.confidence}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-50 rounded-md transition-colors" title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-lttm hover:text-re hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-ltt2">
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
          <div className="bg-ltcard w-full max-w-4xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <h2 className="font-fraunces text-lg font-semibold text-ltt">
                {editingItem ? 'Editar Relación' : 'Añadir Relación'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-lttm hover:text-ltt">x</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="fmea-form" onSubmit={handleSave} className="grid grid-cols-2 gap-x-5 gap-y-4">
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">ID (Formato: A-01)</label>
                  <input type="text" name="id" value={formData.id} onChange={handleFormChange} required disabled={!!editingItem} placeholder="Ej: A-01" className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan disabled:opacity-60" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Familia</label>
                  <select name="family_id" value={formData.family_id} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan">
                    <option value="">Selecciona familia...</option>
                    {families.map(f => (
                      <option key={f.id} value={f.id}>[{f.id}] {f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 border border-ltb p-3 rounded-lg bg-ltbg/50">
                  <label className="block text-[11px] font-plex uppercase text-ltt mb-1.5 flex items-center gap-2">
                    Nodo Origen <span className="w-2 h-2 rounded-full bg-brand-cyan block"></span>
                  </label>
                  <select name="source_node_id" value={formData.source_node_id} onChange={handleFormChange} required className="w-full bg-white border border-ltb rounded-lg px-3 py-2 text-[12px] font-sora outline-none focus:border-brand-cyan">
                    <option value="">Selecciona nodo origen...</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>[{n.domain}] {n.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 border border-ltb p-3 rounded-lg bg-ltbg/50">
                  <label className="block text-[11px] font-plex uppercase text-ltt mb-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-700 block"></span> Nodo Destino
                  </label>
                  <select name="target_node_id" value={formData.target_node_id} onChange={handleFormChange} required className="w-full bg-white border border-ltb rounded-lg px-3 py-2 text-[12px] font-sora outline-none focus:border-brand-cyan">
                    <option value="">Selecciona nodo destino...</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>[{n.domain}] {n.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Tipo de Relación</label>
                  <select name="type" value={formData.type} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan">
                    <option value="causes">causes</option>
                    <option value="amplifies">amplifies</option>
                    <option value="enables">enables</option>
                    <option value="correlates">correlates</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Nivel de Confianza</label>
                  <select name="confidence" value={formData.confidence} onChange={handleFormChange} required className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan">
                    <option value="high">Ato (high)</option>
                    <option value="medium">Medio (medium)</option>
                    <option value="low">Bajo (low)</option>
                  </select>
                </div>

                <div className="col-span-full">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Mecanismo Explicativo</label>
                  <textarea name="explanatory_mechanism" value={formData.explanatory_mechanism} onChange={handleFormChange} required rows={3} className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none" placeholder="Explica cómo se propaga o conecta el evento origen con el destino..." />
                </div>

                <div className="col-span-full">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Condición de Activación</label>
                  <textarea name="activation_condition" value={formData.activation_condition} onChange={handleFormChange} required rows={2} className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none" placeholder="Condiciones bajo las cuales esta relación se materializa..." />
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
                className="px-5 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-lg font-sora text-[13px] font-medium transition-all hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
