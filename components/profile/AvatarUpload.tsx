'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import Image from 'next/image'

interface AvatarUploadProps {
  currentUrl: string
  initials: string
  onUploaded: (url: string) => void
}

export function AvatarUpload({ currentUrl, initials, onUploaded }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setError(null)
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Usa PNG, JPG o WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Máximo 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/user/upload-avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? `Error ${res.status}`); setPreview(null); return }
      onUploaded(data.url)
    } catch {
      setError('Error de red.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Círculo de avatar */}
      <div
        className={`relative w-[96px] h-[96px] rounded-full cursor-pointer group ${isDragging ? 'scale-105' : ''} transition-transform`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        title="Cambiar foto"
      >
        {/* Fondo: foto o gradiente con iniciales */}
        {displayUrl ? (
          <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-ltb">
            <Image src={displayUrl} alt="Avatar" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center border-[3px] border-ltb shadow-[0_2px_12px_rgba(0,173,239,0.25)]">
            <span className="font-sora text-[28px] font-bold text-white select-none">{initials}</span>
          </div>
        )}

        {/* Overlay hover */}
        <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all ${
          uploading ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/40'
        }`}>
          {uploading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          }
        </div>

        {/* Botón quitar */}
        {displayUrl && !uploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreview(null); onUploaded('') }}
            className="absolute -top-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-re flex items-center justify-center text-white shadow-sm hover:bg-re/80 transition-colors z-10"
            title="Eliminar foto"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="text-center">
        <p className="font-sora text-[12px] text-ltt2">
          Arrastra o <span className="text-brand-cyan font-medium cursor-pointer" onClick={() => inputRef.current?.click()}>selecciona una foto</span>
        </p>
        <p className="font-plex text-[10px] text-lttm mt-0.5">PNG · JPG · WebP · máx. 2 MB</p>
        {error && <p className="font-sora text-[11px] text-re mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
      />
    </div>
  )
}
