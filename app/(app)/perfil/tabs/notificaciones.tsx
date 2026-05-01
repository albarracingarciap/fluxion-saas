import { Bell } from 'lucide-react'
import { FieldLabel, SectionHeader, ComingSoonNotice, type ProfileFormData } from './shared'

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
}

export function NotificacionesTab({ formData, setFormData }: Props) {
  return (
    <div>
      <SectionHeader
        icon={<Bell size={16} className="text-ltt2" />}
        title="Notificaciones"
        description="Decide qué eventos te llegan por email y en la aplicación."
      />

      <div className="mb-6">
        <FieldLabel>Notificaciones por email</FieldLabel>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, notifications_email: !formData.notifications_email })}
          className={`flex items-center gap-3 w-fit px-4 py-2.5 rounded-[9px] border transition-all ${
            formData.notifications_email
              ? 'border-brand-cyan bg-[var(--cyan-dim2)]'
              : 'border-ltb bg-ltcard2 hover:border-ltbl'
          }`}
        >
          <div className={`w-[36px] h-[20px] rounded-full transition-colors relative ${
            formData.notifications_email ? 'bg-brand-cyan' : 'bg-ltbl'
          }`}>
            <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
              formData.notifications_email ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`} />
          </div>
          <span className="font-sora text-[13px] text-ltt">
            Recibir alertas por email
          </span>
        </button>
        <p className="font-sora text-[11.5px] text-lttm mt-2">
          Plazos próximos, evidencias por caducar y eventos del SGAI.
        </p>
      </div>

      <ComingSoonNotice>
        La configuración granular por tipo de evento (acciones asignadas, planes pendientes,
        revisiones próximas, resúmenes semanales…) estará disponible en una próxima actualización.
      </ComingSoonNotice>
    </div>
  )
}
