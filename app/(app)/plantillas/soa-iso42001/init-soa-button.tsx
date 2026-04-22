'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { initializeSoA } from './actions'

export function InitSoAButton() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInit = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Usar un FormData vacío si no requerimos mandar nada extra
      const fd = new FormData()
      await initializeSoA(fd)
    } catch (err: any) {
      setError(err.message || 'Error inesperado al intentar inicializar el SoA')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleInit}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[14px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Crear Versión 0 del SoA'}
        {!isSaving && <ArrowRight size={16} />}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-dim border border-reb text-re text-[13px] font-sora max-w-[500px] text-center">
          {error}
          <div className="mt-2 text-[11px] opacity-80">
            Intenta recargar el esquema desde el Dashboard de Supabase o usando la consulta correcta.
          </div>
        </div>
      )}
    </div>
  )
}
