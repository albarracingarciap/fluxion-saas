import { User } from 'lucide-react'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { FieldLabel, SectionHeader, SelectArrow, inputCls, selectCls, type ProfileFormData } from './shared'

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
}

export function InformacionPersonalTab({ formData, setFormData, userEmail, currentRole }: Props) {
  const initials = getInitials(formData.first_name, formData.last_name, userEmail)
  const isAdmin = currentRole === 'org_admin'

  return (
    <div>
      <SectionHeader
        icon={<User size={16} className="text-ltt2" />}
        title="Información personal"
        description="Tu nombre, foto y rol que aparecerán en la plataforma e informes."
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 flex justify-center md:justify-start w-full md:w-auto">
          <AvatarUpload
            currentUrl={formData.avatar_url}
            initials={initials}
            onUploaded={(url) => setFormData({ ...formData, avatar_url: url })}
          />
        </div>

        {/* Campos */}
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
    </div>
  )
}
