'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Save, FileText, Tag } from 'lucide-react'
import { updateSoAMetadata } from './actions'
import type { SoAMetadata } from '@/lib/templates/data'

type Props = {
  isOpen: boolean
  onClose: () => void
  initialData: SoAMetadata
  availableTags: string[]
}

export function MetadataModal({ isOpen, onClose, initialData, availableTags }: Props) {
  const [formData, setFormData] = useState<SoAMetadata>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      scope_system_tags: prev.scope_system_tags.includes(tag)
        ? prev.scope_system_tags.filter((t) => t !== tag)
        : [...prev.scope_system_tags, tag],
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const res = await updateSoAMetadata(formData)
      if (res.error) {
        setError(res.error)
      } else {
        onClose()
      }
    } catch {
      setError('Error inesperado al guardar los metadatos.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#001024]/40 backdrop-blur-sm z-[150] animate-fadein" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] max-h-[90vh] bg-ltcard border border-ltb rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-[151] flex flex-col animate-scalein overflow-hidden">
        <div className="px-7 py-6 border-b border-ltb flex items-center justify-between bg-ltbg shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-dim2 border border-cyan-border flex items-center justify-center text-brand-cyan">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-fraunces text-[20px] text-ltt leading-none">Configurar Cabecera</h3>
              <p className="font-sora text-[12px] text-ltt2 mt-1.5">Metadatos del documento SoA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ltb text-lttm transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-7 flex flex-col gap-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-dim border border-reb/20 text-re text-[13px] font-sora">
              {error}
            </div>
          )}

          {/* Versión + Propietario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Versión</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="Ej: 1.0"
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Propietario</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Responsable AIMS"
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </div>
          </div>

          {/* Aprobado por — nombre + cargo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Aprobado por</label>
              <input
                type="text"
                value={formData.approved_by}
                onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                placeholder="Nombre del aprobador"
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </div>
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Cargo / Rol</label>
              <input
                type="text"
                value={formData.approved_by_role}
                onChange={(e) => setFormData({ ...formData, approved_by_role: e.target.value })}
                placeholder="Ej: CAIO, Dirección General"
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </div>
          </div>

          {/* Fecha aprobación + próxima revisión */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Fecha de aprobación</label>
              <input
                type="date"
                value={formData.approved_at ?? ''}
                onChange={(e) => setFormData({ ...formData, approved_at: e.target.value || null })}
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </div>
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Próxima revisión</label>
              <input
                type="date"
                value={formData.next_review_date ?? ''}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value || null })}
                className="w-full h-[46px] rounded-[12px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
            </div>
          </div>

          {/* Sistemas en alcance — tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt flex items-center gap-1.5">
                <Tag size={14} className="text-lttm" />
                Sistemas incluidos en el alcance
              </label>
              <p className="font-sora text-[12px] text-ltt2">
                Selecciona los grupos de sistemas de IA que cubre esta SoA.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {availableTags.map((tag) => {
                  const selected = formData.scope_system_tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium border transition-all ${
                        selected
                          ? 'bg-cyan-dim2 border-cyan-border text-brand-cyan'
                          : 'bg-ltbg border-ltb text-lttm hover:border-brand-cyan/40'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Alcance — justificación */}
          <div className="space-y-2">
            <label className="font-sora text-[13px] font-semibold text-ltt block">Justificación del alcance</label>
            <textarea
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              placeholder="Describe qué unidades, procesos o servicios de IA cubre este SoA y por qué se definió este perímetro..."
              className="w-full h-28 rounded-[12px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan resize-none"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[10px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
