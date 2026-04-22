'use client'

import { useRef, useState } from 'react'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface LogoUploadProps {
  currentUrl: string
  disabled?: boolean
  onUploaded: (url: string) => void
}

export function LogoUpload({ currentUrl, disabled, onUploaded }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setError(null)

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Formato no soportado. Usa PNG, JPG, SVG o WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('El archivo supera el límite de 2 MB.')
      return
    }

    // Preview local inmediato
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/organization/upload-logo', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        setPreview(null)
        return
      }

      onUploaded(data.url)
    } catch {
      setError('Error de red al subir el archivo.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleRemove() {
    setPreview(null)
    onUploaded('')
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className="flex items-start gap-5">

      {/* Preview */}
      <div className="shrink-0 w-[80px] h-[80px] rounded-[10px] border border-ltb bg-ltcard2 flex items-center justify-center overflow-hidden relative">
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt="Logo de la organización"
              fill
              className="object-contain p-2"
              unoptimized
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-re/90 flex items-center justify-center text-white hover:bg-re transition-colors"
                title="Eliminar logo"
              >
                <X size={10} />
              </button>
            )}
          </>
        ) : (
          <ImageIcon size={24} className="text-lttm" />
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-6 py-5 cursor-pointer transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-ltb bg-ltcard2'
            : isDragging
              ? 'border-brand-cyan bg-[var(--cyan-dim)] scale-[1.01]'
              : 'border-ltb bg-ltcard2 hover:border-ltbl hover:bg-ltbg'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="text-brand-cyan animate-spin" />
            <span className="font-sora text-[12px] text-lttm">Subiendo...</span>
          </>
        ) : (
          <>
            <Upload size={18} className={isDragging ? 'text-brand-cyan' : 'text-lttm'} />
            <div className="text-center">
              <span className="font-sora text-[12.5px] text-ltt2">
                Arrastra tu logo aquí{' '}
                <span className="text-brand-cyan font-medium">o haz clic para seleccionar</span>
              </span>
              <p className="font-plex text-[10.5px] text-lttm mt-1">
                PNG · JPG · SVG · WebP · máx. 2 MB
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="absolute font-sora text-[11.5px] text-re mt-1">{error}</p>
      )}
    </div>
  )
}
