'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import {
  AccountPrefs, TIMEZONES,
  inputCls, selectCls, SelectArrow, SectionHeader, FieldLabel, SaveBar,
} from './shared';
import { updateAccountPrefs } from '../actions';

interface Props {
  initialPrefs: AccountPrefs
  onSaved: () => void
}

export function MiCuentaTab({ initialPrefs, onSaved }: Props) {
  const [form, setForm]     = useState<AccountPrefs>(initialPrefs)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof AccountPrefs>(key: K, value: AccountPrefs[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await updateAccountPrefs(form)
    if (res.error) {
      setError(res.error)
    } else {
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  // Radio button helper
  function RadioGroup<T extends string>({
    label, options, value, onChange,
  }: {
    label:    string
    options:  Array<{ value: T; label: string; desc?: string }>
    value:    T
    onChange: (v: T) => void
  }) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className={`grid gap-2.5 grid-cols-${Math.min(options.length, 3)}`}>
          {options.map((opt) => {
            const selected = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`rounded-[9px] border px-3.5 py-2.5 text-left transition-all ${
                  selected
                    ? 'border-brand-cyan bg-cyan-dim shadow-[0_0_0_2px_rgba(0,173,239,0.08)]'
                    : 'border-ltb bg-ltcard2 hover:border-ltbl hover:bg-ltbg'
                }`}
              >
                <span className={`font-sora text-[13px] font-medium block ${selected ? 'text-brand-cyan' : 'text-ltt'}`}>
                  {opt.label}
                </span>
                {opt.desc && <span className="font-sora text-[11.5px] text-lttm mt-0.5 block">{opt.desc}</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
      <SectionHeader
        icon={<User size={16} className="text-ltt2" />}
        title="Mi cuenta"
        description="Preferencias de idioma, zona horaria y visualización."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

        {/* Language */}
        <div>
          <FieldLabel>Idioma de la interfaz</FieldLabel>
          <div className="relative">
            <select
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              className={selectCls}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <SelectArrow />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <FieldLabel>Zona horaria</FieldLabel>
          <div className="relative">
            <select
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              className={selectCls}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Afecta a las fechas y horas mostradas en la plataforma.
          </p>
        </div>

        {/* Date format */}
        <RadioGroup
          label="Formato de fecha"
          value={form.date_format}
          onChange={(v) => set('date_format', v)}
          options={[
            { value: 'dd/mm/yyyy', label: 'DD/MM/AAAA', desc: '31/12/2025' },
            { value: 'mm/dd/yyyy', label: 'MM/DD/AAAA', desc: '12/31/2025' },
            { value: 'yyyy-mm-dd', label: 'AAAA-MM-DD', desc: '2025-12-31' },
          ]}
        />

        {/* Time format */}
        <RadioGroup
          label="Formato de hora"
          value={form.time_format}
          onChange={(v) => set('time_format', v)}
          options={[
            { value: '24h', label: '24 horas', desc: '14:30' },
            { value: '12h', label: '12 horas', desc: '2:30 PM' },
          ]}
        />

        {/* Density */}
        <RadioGroup
          label="Densidad de la UI"
          value={form.density}
          onChange={(v) => set('density', v)}
          options={[
            { value: 'comfortable', label: 'Cómoda',   desc: 'Espaciado estándar' },
            { value: 'compact',     label: 'Compacta',  desc: 'Mayor densidad de info' },
          ]}
        />

        {/* Start of week */}
        <RadioGroup
          label="Inicio de semana"
          value={form.start_of_week}
          onChange={(v) => set('start_of_week', v)}
          options={[
            { value: 'monday', label: 'Lunes' },
            { value: 'sunday', label: 'Domingo' },
          ]}
        />

      </div>

      <SaveBar loading={loading} saved={saved} error={error} onSave={handleSave} />
    </div>
  )
}
