import { Lock } from 'lucide-react'
import { SectionHeader, ComingSoonNotice } from './shared'

export function SeguridadTab() {
  return (
    <div>
      <SectionHeader
        icon={<Lock size={16} className="text-ltt2" />}
        title="Seguridad"
        description="Contraseña, autenticación de dos factores y dispositivos con sesión activa."
      />

      <div className="space-y-4">
        <div className="rounded-[10px] border border-ltb bg-ltcard2 px-5 py-4">
          <p className="font-sora text-[13px] font-semibold text-ltt mb-1">Contraseña</p>
          <p className="font-sora text-[12px] text-lttm">
            Cambia tu contraseña periódicamente para mantener la cuenta protegida.
          </p>
        </div>

        <div className="rounded-[10px] border border-ltb bg-ltcard2 px-5 py-4">
          <p className="font-sora text-[13px] font-semibold text-ltt mb-1">Autenticación de dos factores</p>
          <p className="font-sora text-[12px] text-lttm">
            Añade una capa extra de seguridad usando una app autenticadora (TOTP).
          </p>
        </div>

        <div className="rounded-[10px] border border-ltb bg-ltcard2 px-5 py-4">
          <p className="font-sora text-[13px] font-semibold text-ltt mb-1">Sesiones activas</p>
          <p className="font-sora text-[12px] text-lttm">
            Revisa los dispositivos con sesión iniciada y revoca accesos no reconocidos.
          </p>
        </div>

        <ComingSoonNotice>
          La gestión de contraseña, MFA y sesiones activas estará disponible
          en el próximo paso de evolución del perfil.
        </ComingSoonNotice>
      </div>
    </div>
  )
}
