import { SlidersHorizontal } from 'lucide-react'
import { FieldLabel, SectionHeader, SelectArrow, selectCls, type ProfileFormData } from './shared'

const TIMEZONES = [
  { value: 'Europe/Madrid',    label: 'Madrid (CET/CEST)' },
  { value: 'Europe/London',    label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris',     label: 'París (CET/CEST)' },
  { value: 'Europe/Berlin',    label: 'Berlín (CET/CEST)' },
  { value: 'Europe/Rome',      label: 'Roma (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Ámsterdam (CET/CEST)' },
  { value: 'Europe/Brussels',  label: 'Bruselas (CET/CEST)' },
  { value: 'Europe/Lisbon',    label: 'Lisboa (WET/WEST)' },
  { value: 'Europe/Warsaw',    label: 'Varsovia (CET/CEST)' },
  { value: 'Europe/Stockholm', label: 'Estocolmo (CET/CEST)' },
  { value: 'Europe/Vienna',    label: 'Viena (CET/CEST)' },
  { value: 'Europe/Athens',    label: 'Atenas (EET/EEST)' },
  { value: 'UTC',              label: 'UTC' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
  { value: 'D MMM YYYY', label: 'D MMM YYYY (31 dic 2026)' },
]

const WEEK_START_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 0, label: 'Domingo' },
]

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
}

export function PreferenciasTab({ formData, setFormData }: Props) {
  return (
    <div>
      <SectionHeader
        icon={<SlidersHorizontal size={16} className="text-ltt2" />}
        title="Preferencias regionales"
        description="Zona horaria, idioma y formato de fechas usados en toda la plataforma."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <FieldLabel>Zona horaria</FieldLabel>
          <div className="relative">
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className={selectCls}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Afecta a la visualización de fechas y plazos en toda la plataforma.
          </p>
        </div>

        <div>
          <FieldLabel>Idioma de la interfaz</FieldLabel>
          <div className="relative">
            <select disabled value="es" className={selectCls}>
              <option value="es">Español</option>
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Más idiomas disponibles próximamente.
          </p>
        </div>

        <div>
          <FieldLabel>Formato de fecha</FieldLabel>
          <div className="relative">
            <select
              value={formData.date_format}
              onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
              className={selectCls}
            >
              {DATE_FORMATS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <SelectArrow />
          </div>
        </div>

        <div>
          <FieldLabel>Primer día de la semana</FieldLabel>
          <div className="relative">
            <select
              value={String(formData.week_starts_on)}
              onChange={(e) => setFormData({ ...formData, week_starts_on: Number(e.target.value) })}
              className={selectCls}
            >
              {WEEK_START_OPTIONS.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
              ))}
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Aplicará a calendarios y vistas semanales.
          </p>
        </div>
      </div>
    </div>
  )
}
