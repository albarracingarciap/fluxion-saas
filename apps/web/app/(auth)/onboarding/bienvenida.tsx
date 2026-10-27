'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { completeWelcome } from './actions'

/**
 * Bienvenida de un miembro que no configura la organización (B18c, A2): un
 * invitado, o un Administrador que llega a una organización ya configurada.
 * No toca la organización.
 */
export function Bienvenida({ organizationName, roleLabels }: { organizationName: string; roleLabels: string[] }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function empezar() {
    setSaving(true)
    setError(null)
    const res = await completeWelcome()
    if ('error' in res) { setError(res.error); setSaving(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] bg-ltcard border border-ltb rounded-[14px] shadow-[0_8px_32px_#004aad0c] animate-fadein p-10 text-center">
      <Image src="/compaas-ia.png" alt="CompaaS IA" width={125} height={36} className="h-9 w-auto opacity-80 mb-8" priority />
      <div className="w-16 h-16 bg-grdim rounded-full flex items-center justify-center mb-5">
        <CheckCircle2 className="text-gr w-8 h-8" />
      </div>
      <h1 className="font-fraunces text-[26px] font-semibold text-ltt">Te damos la bienvenida a {organizationName}</h1>
      <p className="font-sora text-[14px] text-ltt2 mt-3 leading-relaxed">
        {roleLabels.length > 0
          ? <>Entras con {roleLabels.length === 1 ? 'el rol' : 'los roles'} <strong>{roleLabels.join(', ')}</strong>. La organización ya está configurada.</>
          : 'La organización ya está configurada.'}
      </p>
      {error && <p className="font-sora text-[13px] text-re mt-4">{error}</p>}
      <Button
        onClick={empezar}
        disabled={saving}
        className="mt-8 bg-gradient-to-r from-brand-cyan to-cyan-light text-white font-sora py-2.5 px-8 h-auto rounded-[8px] text-[14px]"
      >
        {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
        Empezar
      </Button>
    </div>
  )
}
