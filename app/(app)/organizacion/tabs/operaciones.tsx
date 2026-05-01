'use client';

import { Settings2, ShieldAlert, Palette } from 'lucide-react';
import { FISCAL_MONTHS, REPORT_LANGUAGES } from '@/lib/organization/options';
import { SectionHeader, FieldLabel, inputCls, selectCls, SelectArrow, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

// Opciones de retención con etiqueta + valor en meses
const RETENTION_OPTIONS = [
  { label: '1 año',    value: 12  },
  { label: '2 años',   value: 24  },
  { label: '3 años',   value: 36  },
  { label: '5 años',   value: 60  },
  { label: '7 años',   value: 84  },
  { label: '10 años',  value: 120 },
]

function RetentionSelect({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="relative">
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={selectCls}
      >
        {RETENTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <SelectArrow />
    </div>
  )
}

export function OperacionesTab({ formData, setFormData, isAdmin }: Props) {
  function set<K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Parámetros operativos */}
      <div>
        <SectionHeader
          icon={<Settings2 size={16} className="text-ltt2" />}
          title="Parámetros operativos"
          description="Ejercicio fiscal e idioma de los documentos generados por la plataforma."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Inicio del ejercicio fiscal</FieldLabel>
            <div className="relative">
              <select
                disabled={!isAdmin}
                value={formData.fiscal_year_start}
                onChange={(e) => set('fiscal_year_start', Number(e.target.value))}
                className={selectCls}
              >
                {FISCAL_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <SelectArrow />
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Afecta a los ciclos de revisión FMEA y plazos de tratamiento.
            </p>
          </div>

          <div>
            <FieldLabel>Idioma de los documentos</FieldLabel>
            <div className="relative">
              <select
                disabled={!isAdmin}
                value={formData.report_language}
                onChange={(e) => set('report_language', e.target.value)}
                className={selectCls}
              >
                {REPORT_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <SelectArrow />
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Idioma por defecto para informes generados por el Agente 3.
            </p>
          </div>

        </div>
      </div>

      {/* Retención de datos */}
      <div>
        <SectionHeader
          icon={<ShieldAlert size={16} className="text-ltt2" />}
          title="Políticas de retención"
          description="Plazos mínimos de conservación por categoría, alineados con RGPD y AI Act."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Documentos de evidencia</FieldLabel>
            <RetentionSelect
              value={formData.evidence_retention_months}
              onChange={(v) => set('evidence_retention_months', v)}
              disabled={!isAdmin}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Recomendado: 7 años (AI Act, art. 72).
            </p>
          </div>

          <div>
            <FieldLabel>Logs de auditoría</FieldLabel>
            <RetentionSelect
              value={formData.audit_log_retention_months}
              onChange={(v) => set('audit_log_retention_months', v)}
              disabled={!isAdmin}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Mínimo recomendado: 3 años.
            </p>
          </div>

          <div>
            <FieldLabel>Datos personales procesados</FieldLabel>
            <RetentionSelect
              value={formData.personal_data_retention_months}
              onChange={(v) => set('personal_data_retention_months', v)}
              disabled={!isAdmin}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Conforme al principio de minimización del RGPD.
            </p>
          </div>

        </div>

        <div className="mt-5 p-3.5 rounded-[9px] bg-ltcard2 border border-ltb flex items-start gap-2.5">
          <ShieldAlert size={14} className="text-lttm mt-0.5 shrink-0" />
          <p className="font-sora text-[11.5px] text-lttm leading-relaxed">
            Estos valores definen la política declarada. La eliminación efectiva de los datos depende de los procesos de limpieza configurados en la infraestructura.
          </p>
        </div>
      </div>

      {/* Branding */}
      <div>
        <SectionHeader
          icon={<Palette size={16} className="text-ltt2" />}
          title="Branding de documentos"
          description="Personalización visual de los informes y documentos exportados por la plataforma."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Color principal</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="color"
                disabled={!isAdmin}
                value={formData.brand_primary_color}
                onChange={(e) => set('brand_primary_color', e.target.value)}
                className="w-10 h-10 rounded-[7px] border border-ltb bg-ltcard cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-1"
              />
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.brand_primary_color}
                onChange={(e) => set('brand_primary_color', e.target.value)}
                className={inputCls + ' font-mono uppercase'}
                placeholder="#00ADEF"
                maxLength={7}
              />
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Se aplica en cabeceras de informes exportados.
            </p>
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Texto del pie de página</FieldLabel>
            <textarea
              disabled={!isAdmin}
              value={formData.doc_footer_text}
              onChange={(e) => set('doc_footer_text', e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Ej. Documento confidencial · Generado por Fluxion AI Governance · www.empresa.com"
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Aparece en el pie de todos los documentos generados por el Agente 3.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
