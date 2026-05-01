import { User } from 'lucide-react'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import {
  FieldLabel, SectionHeader, SelectArrow,
  inputCls, selectCls,
  type ProfileFormData, type ManagerOption,
} from './shared'

const ROLE_LABELS: Record<string, string> = {
  org_admin:          'Administrador',
  sgai_manager:       'SGAI Manager',
  caio:               'CAIO',
  dpo:                'DPO',
  system_owner:       'System Owner',
  risk_analyst:       'Analista de Riesgos',
  compliance_analyst: 'Analista de Cumplimiento',
  executive:          'Directivo',
  auditor:            'Auditor',
  viewer:             'Lector',
}

const BIO_MAX_LENGTH = 280

function getInitials(first?: string | null, last?: string | null, email?: string | null) {
  const f = first?.[0] ?? ''
  const l = last?.[0] ?? ''
  if (f || l) return (f + l).toUpperCase()
  return (email?.[0] ?? '?').toUpperCase()
}

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
  userEmail: string | null | undefined
  currentRole: string | null | undefined
  managers: ManagerOption[]
}

export function InformacionPersonalTab({
  formData,
  setFormData,
  userEmail,
  currentRole,
  managers,
}: Props) {
  const initials = getInitials(formData.first_name, formData.last_name, userEmail)
  const isAdmin = currentRole === 'org_admin'
  const bioLen = formData.bio.length

  return (
    <div>
      <SectionHeader
        icon={<User size={16} className="text-ltt2" />}
        title="Información personal"
        description="Tu nombre, foto, rol y datos de identidad que verán otros miembros de la organización."
      />

      {/* ── Identidad básica + avatar ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-8 items-start mb-7">
        <div className="flex-shrink-0 flex justify-center md:justify-start w-full md:w-auto">
          <AvatarUpload
            currentUrl={formData.avatar_url}
            initials={initials}
            onUploaded={(url) => setFormData({ ...formData, avatar_url: url })}
          />
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className={inputCls}
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <FieldLabel>Apellidos</FieldLabel>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={inputCls}
              placeholder="Tus apellidos"
            />
          </div>

          <div>
            <FieldLabel>Cargo / Puesto</FieldLabel>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className={inputCls}
              placeholder="Ej. Director de Riesgos"
            />
          </div>

          <div>
            <FieldLabel>Departamento</FieldLabel>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className={inputCls}
              placeholder="Ej. Compliance / IT"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Rol Fluxion</FieldLabel>
            <div className="relative">
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={selectCls}
                disabled={!isAdmin}
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <SelectArrow />
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              {isAdmin
                ? 'Como administrador, puedes gestionar el rol asignado.'
                : 'Este campo solo puede ser modificado por un administrador de la organización.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Identidad ampliada ──────────────────────────────────────────── */}
      <div className="pt-6 border-t border-ltb">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm font-semibold mb-4">
          Identidad ampliada
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Bio corta</FieldLabel>
              <span className={`font-plex text-[10px] ${bioLen > BIO_MAX_LENGTH ? 'text-re' : 'text-lttm'}`}>
                {bioLen}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className={inputCls + ' resize-none min-h-[80px]'}
              placeholder="Una o dos frases sobre ti que aparecerán en hovers de owner y firmas de exports."
              maxLength={BIO_MAX_LENGTH + 50}
              rows={3}
            />
          </div>

          <div>
            <FieldLabel>Manager</FieldLabel>
            <div className="relative">
              <select
                value={formData.manager_id ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, manager_id: e.target.value || null })
                }
                className={selectCls}
              >
                <option value="">Sin asignar</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                    {m.job_title ? ` — ${m.job_title}` : ''}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Tu manager directo dentro de la organización. Útil para escalados y aprobaciones.
            </p>
          </div>

          <div>
            <FieldLabel>Pronombres</FieldLabel>
            <input
              type="text"
              value={formData.pronouns}
              onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
              className={inputCls}
              placeholder="Ej. ella, él, elle"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Opcional. Se mostrará junto a tu nombre cuando elijas hacerlos visibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
