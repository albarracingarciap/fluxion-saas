import { ShieldCheck, Mail, Calendar, Building2, Phone, AtSign } from 'lucide-react'
import { FieldLabel, SectionHeader, inputCls, type ProfileFormData } from './shared'

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
  userEmail: string | null | undefined
  memberSince: string | null | undefined
  organizationName: string | null | undefined
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function CuentaTab({
  formData,
  setFormData,
  userEmail,
  memberSince,
  organizationName,
}: Props) {
  return (
    <div>
      <SectionHeader
        icon={<ShieldCheck size={16} className="text-ltt2" />}
        title="Cuenta"
        description="Identidad corporativa, datos de contacto y acceso a la plataforma."
      />

      {/* ── Datos de cuenta (read-only) ─────────────────────────────────── */}
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm font-semibold mb-3">
        Identidad corporativa
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
        <InfoCard icon={<Mail size={13} />} label="Email primario">
          {userEmail ?? '—'}
        </InfoCard>
        <InfoCard icon={<Calendar size={13} />} label="Miembro desde">
          {formatDate(memberSince)}
        </InfoCard>
        <InfoCard icon={<Building2 size={13} />} label="Organización" wide>
          {organizationName ?? '—'}
        </InfoCard>
      </div>

      {/* ── Contacto editable ───────────────────────────────────────────── */}
      <div className="pt-5 border-t border-ltb">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm font-semibold mb-4">
          Contacto
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <FieldLabel>
              <Phone size={11} className="text-lttm" />
              Teléfono
            </FieldLabel>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputCls}
              placeholder="+34 600 000 000"
              autoComplete="tel"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Móvil corporativo o número de contacto. Se usa para escalados de incidentes.
            </p>
          </div>

          <div>
            <FieldLabel>
              <AtSign size={11} className="text-lttm" />
              Email alternativo
            </FieldLabel>
            <input
              type="email"
              value={formData.secondary_email}
              onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
              className={inputCls}
              placeholder="otro@correo.com"
              autoComplete="email"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Opcional. Si lo defines, las notificaciones por email irán también a esta dirección.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  children,
  wide = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={`rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">
        <span className="text-lttm">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="font-sora text-[13px] text-ltt truncate">{children}</div>
    </div>
  )
}
