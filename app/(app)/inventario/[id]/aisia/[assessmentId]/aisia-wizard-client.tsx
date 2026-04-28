'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AisiaAssessmentEntry, AisiaSectionEntry } from '../../system-detail-client';
import { updateAisiaSection, submitAisia } from '../actions';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type FailureModeRow = {
  id: string;
  failure_mode_id: string;
  dimension_id: string;
  activation_source: string | null;
  priority_level: string | null;
  priority_score: number | null;
};

type TreatmentPlanRow = {
  id: string;
  code: string;
  status: string;
  zone_at_creation: string | null;
  zone_target: string | null;
  actions_total: number | null;
  actions_completed: number | null;
  residual_risk_notes: string | null;
};

// ─── Definición de secciones ─────────────────────────────────────────────────

const SECTIONS = [
  { code: 'S1', label: 'Descripción del sistema',      short: 'Sistema' },
  { code: 'S2', label: 'Datos e información',           short: 'Datos' },
  { code: 'S3', label: 'Modos de fallo identificados', short: 'Riesgos' },
  { code: 'S4', label: 'Acciones de tratamiento',       short: 'Tratamiento' },
  { code: 'S5', label: 'Impacto en personas',           short: 'Personas' },
  { code: 'S6', label: 'Impacto social',                short: 'Social' },
] as const;

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function sectionStatusStyle(status: string) {
  if (status === 'complete')    return { dot: 'bg-gr',   label: 'Completa',    ring: 'ring-gr/30' };
  if (status === 'in_progress') return { dot: 'bg-or',   label: 'En progreso', ring: 'ring-or/30' };
  return                               { dot: 'bg-ltb',  label: 'Pendiente',   ring: '' };
}

function Textarea({
  label, value, onChange, placeholder, rows = 4, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block font-plex text-[12px] font-semibold text-ltt mb-1.5">{label}</label>
      {hint && <p className="font-plex text-[11.5px] text-lttm mb-2">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 font-plex text-[13px] text-ltt placeholder:text-lttm/50 focus:outline-none focus:ring-2 focus:ring-[#004aad30] focus:border-[#004aad60] resize-y transition-colors"
      />
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block font-plex text-[12px] font-semibold text-ltt mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 font-plex text-[13px] text-ltt placeholder:text-lttm/50 focus:outline-none focus:ring-2 focus:ring-[#004aad30] focus:border-[#004aad60] transition-colors"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block font-plex text-[12px] font-semibold text-ltt mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 font-plex text-[13px] text-ltt focus:outline-none focus:ring-2 focus:ring-[#004aad30] focus:border-[#004aad60] transition-colors"
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label, value, onChange, hint,
}: {
  label: string; value: boolean | null; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors shrink-0 ${
          value ? 'bg-[#004aad]' : 'bg-ltb'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <div className="font-plex text-[12px] font-semibold text-ltt">{label}</div>
        {hint && <div className="font-plex text-[11.5px] text-lttm mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[10px] p-5 space-y-4">
      <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function PrefilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] font-plex text-[9.5px] bg-[#004aad0d] text-[#004aad] border border-[#004aad22] ml-2">
      Pre-relleno
    </span>
  );
}

// ─── Componentes de sección ───────────────────────────────────────────────────

function SectionS1({
  data, system, onChange,
}: {
  data: Record<string, unknown>;
  system: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string, fallback = '') =>
    String(data[key] ?? system[key] ?? fallback);
  const bool = (key: string): boolean =>
    (data[key] ?? system[key]) === true;

  return (
    <div className="space-y-5">
      <SectionCard title="Identificación">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-plex text-[12px] font-semibold text-ltt mb-1.5">
              Nombre del sistema <PrefilledBadge />
            </label>
            <input
              type="text"
              value={str('system_name', String(system.name ?? ''))}
              onChange={(e) => onChange('system_name', e.target.value)}
              className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 font-plex text-[13px] text-ltt focus:outline-none focus:ring-2 focus:ring-[#004aad30] focus:border-[#004aad60] transition-colors"
            />
          </div>
          <div>
            <label className="block font-plex text-[12px] font-semibold text-ltt mb-1.5">
              Versión <PrefilledBadge />
            </label>
            <input
              type="text"
              value={str('version', String(system.version ?? ''))}
              onChange={(e) => onChange('version', e.target.value)}
              className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 font-plex text-[13px] text-ltt focus:outline-none focus:ring-2 focus:ring-[#004aad30] focus:border-[#004aad60] transition-colors"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Propósito y uso">
        <Textarea
          label="Uso previsto"
          value={str('intended_use', String(system.intended_use ?? ''))}
          onChange={(v) => onChange('intended_use', v)}
          placeholder="Describe el propósito principal del sistema y los casos de uso para los que fue diseñado…"
          rows={4}
          hint="Pre-relleno desde la ficha del sistema. Ajusta si es necesario para el contexto AISIA."
        />
        <Textarea
          label="Usos prohibidos"
          value={str('prohibited_uses', String(system.prohibited_uses ?? ''))}
          onChange={(v) => onChange('prohibited_uses', v)}
          placeholder="Lista los usos para los que el sistema NO debe emplearse…"
          rows={3}
        />
        <Textarea
          label="Descripción técnica"
          value={str('technical_description', String(system.technical_description ?? ''))}
          onChange={(v) => onChange('technical_description', v)}
          placeholder="Describe la arquitectura técnica, modelo base, integraciones externas…"
          rows={4}
        />
      </SectionCard>

      <SectionCard title="Características de operación">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Sistema completamente automatizado"
            value={data.fully_automated !== undefined ? bool('fully_automated') : (system.fully_automated as boolean | null)}
            onChange={(v) => onChange('fully_automated', v)}
            hint="¿Toma decisiones sin intervención humana?"
          />
          <Toggle
            label="Interactúa directamente con personas"
            value={data.interacts_persons !== undefined ? bool('interacts_persons') : (system.interacts_persons as boolean | null)}
            onChange={(v) => onChange('interacts_persons', v)}
          />
        </div>
        <Textarea
          label="Contexto de despliegue"
          value={str('deployment_context')}
          onChange={(v) => onChange('deployment_context', v)}
          placeholder="Describe dónde y cómo se despliega el sistema (entornos, usuarios, escala, geografía)…"
          rows={3}
        />
        <Textarea
          label="Stack tecnológico relevante"
          value={str('tech_stack')}
          onChange={(v) => onChange('tech_stack', v)}
          placeholder="Tecnologías principales, frameworks de ML, proveedores externos de modelo…"
          rows={2}
        />
      </SectionCard>
    </div>
  );
}

function SectionS2({
  data, system, onChange,
}: {
  data: Record<string, unknown>;
  system: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string, fallback = '') =>
    String(data[key] ?? system[key] ?? fallback);
  const bool = (key: string): boolean =>
    (data[key] ?? system[key]) === true;

  return (
    <div className="space-y-5">
      <SectionCard title="Datos personales">
        <Toggle
          label="El sistema procesa datos personales"
          value={data.processes_personal_data !== undefined ? bool('processes_personal_data') : (system.processes_personal_data as boolean | null)}
          onChange={(v) => onChange('processes_personal_data', v)}
          hint="Incluye cualquier información que identifique o permita identificar a una persona"
        />
        <Textarea
          label="Descripción de las fuentes de datos"
          value={str('data_sources_description')}
          onChange={(v) => onChange('data_sources_description', v)}
          placeholder="Describe el origen de los datos utilizados: bases de datos internas, APIs externas, datos públicos, datos de usuarios…"
          rows={3}
        />
        <Textarea
          label="Categorías de datos tratados"
          value={str('data_categories_description', Array.isArray(system.data_categories) ? (system.data_categories as string[]).join(', ') : '')}
          onChange={(v) => onChange('data_categories_description', v)}
          placeholder="p.ej. nombre, email, localización, historial de compras, datos de comportamiento…"
          rows={2}
        />
        <Textarea
          label="Categorías especiales de datos (Art. 9 RGPD)"
          value={str('special_categories_description', Array.isArray(system.special_categories) ? (system.special_categories as string[]).join(', ') : '')}
          onChange={(v) => onChange('special_categories_description', v)}
          placeholder="Salud, origen étnico, datos biométricos, afiliación sindical… (dejar vacío si no aplica)"
          rows={2}
        />
      </SectionCard>

      <SectionCard title="Ciclo de vida del dato">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Volumen de datos"
            value={str('data_volume', String(system.data_volume ?? ''))}
            onChange={(v) => onChange('data_volume', v)}
            options={[
              { value: 'menos_1gb',   label: '< 1 GB' },
              { value: '1_100gb',     label: '1–100 GB' },
              { value: '100gb_1tb',   label: '100 GB – 1 TB' },
              { value: '1_10tb',      label: '1–10 TB' },
              { value: 'mas_10tb',    label: '> 10 TB' },
              { value: 'desconocido', label: 'Desconocido' },
            ]}
          />
          <SelectField
            label="Retención de datos"
            value={str('data_retention', String(system.data_retention ?? ''))}
            onChange={(v) => onChange('data_retention', v)}
            options={[
              { value: 'menos_6m',    label: '< 6 meses' },
              { value: '6_12m',       label: '6–12 meses' },
              { value: '1_3a',        label: '1–3 años' },
              { value: '3_5a',        label: '3–5 años' },
              { value: 'mas_5a',      label: '> 5 años' },
              { value: 'sin_politica', label: 'Sin política definida' },
            ]}
          />
        </div>
        <Textarea
          label="Medidas de calidad del dato"
          value={str('data_quality_measures')}
          onChange={(v) => onChange('data_quality_measures', v)}
          placeholder="Describe los controles de calidad, validación y limpieza de datos aplicados…"
          rows={3}
        />
      </SectionCard>

      <SectionCard title="Estado DPIA">
        <SelectField
          label="DPIA realizada"
          value={str('dpia_status', String(system.dpia_completed ?? ''))}
          onChange={(v) => onChange('dpia_status', v)}
          options={[
            { value: 'si',      label: 'Sí — completada' },
            { value: 'proceso', label: 'En proceso' },
            { value: 'parcial', label: 'Parcial' },
            { value: 'no',      label: 'No realizada' },
          ]}
        />
        <Textarea
          label="Notas sobre la DPIA / bases legales"
          value={str('dpia_notes')}
          onChange={(v) => onChange('dpia_notes', v)}
          placeholder="Referencia al documento DPIA, bases legales aplicadas (Art. 6 / Art. 9 RGPD), conclusiones principales…"
          rows={3}
        />
      </SectionCard>
    </div>
  );
}

function SectionS3({
  data, failureModes, onChange,
}: {
  data: Record<string, unknown>;
  failureModes: FailureModeRow[];
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string) => String(data[key] ?? '');
  const selectedIds: string[] = Array.isArray(data.selected_failure_mode_ids)
    ? (data.selected_failure_mode_ids as string[])
    : [];

  const toggleFailureMode = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange('selected_failure_mode_ids', next);
  };

  const DIMENSION_LABELS: Record<string, string> = {
    tecnica:        'Técnica',
    datos:          'Datos',
    etica:          'Ética',
    legal:          'Legal / Cumplimiento',
    operacional:    'Operacional',
    seguridad:      'Seguridad',
  };

  const priorityStyle = (level: string | null) => {
    if (level === 'critical' || level === 'high')   return 'text-re bg-red-dim border-reb';
    if (level === 'medium')                          return 'text-or bg-ordim border-orb';
    return                                                  'text-lttm bg-ltcard border-ltb';
  };

  return (
    <div className="space-y-5">
      {failureModes.length > 0 ? (
        <SectionCard title="Modos de fallo del sistema">
          <p className="font-plex text-[12px] text-lttm">
            Selecciona los modos de fallo relevantes para esta evaluación AISIA.
            Son los identificados en el análisis FMEA del sistema.
          </p>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {failureModes.map((fm) => (
              <label
                key={fm.id}
                className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  selectedIds.includes(fm.id)
                    ? 'bg-[#004aad08] border-[#004aad30]'
                    : 'bg-ltbg border-ltb hover:bg-ltcard2'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(fm.id)}
                  onChange={() => toggleFailureMode(fm.id)}
                  className="mt-0.5 accent-[#004aad]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt">
                      {fm.activation_source ?? fm.failure_mode_id}
                    </span>
                    <span className="font-plex text-[10px] text-lttm bg-ltcard2 border border-ltb px-1.5 py-0.5 rounded-[4px]">
                      {DIMENSION_LABELS[fm.dimension_id] ?? fm.dimension_id}
                    </span>
                    {fm.priority_level && (
                      <span className={`font-plex text-[9.5px] px-1.5 py-0.5 rounded-[4px] border ${priorityStyle(fm.priority_level)}`}>
                        {fm.priority_level}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="font-plex text-[11.5px] text-lttm">
            {selectedIds.length} de {failureModes.length} modos seleccionados
          </div>
        </SectionCard>
      ) : (
        <div className="bg-ltcard2 border border-ltb rounded-[10px] p-5 text-center">
          <div className="font-plex text-[13px] text-lttm mb-1">Sin análisis FMEA disponible</div>
          <div className="font-plex text-[12px] text-lttm/70">
            Este sistema no tiene modos de fallo activados. Puedes documentar los riesgos manualmente a continuación.
          </div>
        </div>
      )}

      <SectionCard title="Narrativa de riesgos">
        <Textarea
          label="Resumen de riesgos identificados"
          value={str('risk_summary')}
          onChange={(v) => onChange('risk_summary', v)}
          placeholder="Describe los principales riesgos que este sistema IA puede generar: errores de predicción, sesgos, fallos de seguridad, dependencias críticas…"
          rows={5}
          hint="Explica cómo los modos de fallo seleccionados se traducen en riesgos para usuarios y partes interesadas."
        />
        <Textarea
          label="Riesgos adicionales no cubiertos por FMEA"
          value={str('additional_risks')}
          onChange={(v) => onChange('additional_risks', v)}
          placeholder="Riesgos específicos del contexto de uso, riesgos emergentes, factores externos…"
          rows={3}
        />
      </SectionCard>
    </div>
  );
}

function SectionS4({
  data, treatmentPlans, onChange,
}: {
  data: Record<string, unknown>;
  treatmentPlans: TreatmentPlanRow[];
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string) => String(data[key] ?? '');
  const selectedPlanId = String(data.treatment_plan_id ?? '');

  return (
    <div className="space-y-5">
      {treatmentPlans.length > 0 && (
        <SectionCard title="Plan de tratamiento activo">
          <p className="font-plex text-[12px] text-lttm">
            Vincula el plan de tratamiento FMEA de referencia para esta evaluación.
          </p>
          <div className="space-y-2">
            {treatmentPlans.map((plan) => (
              <label
                key={plan.id}
                className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  selectedPlanId === plan.id
                    ? 'bg-[#004aad08] border-[#004aad30]'
                    : 'bg-ltbg border-ltb hover:bg-ltcard2'
                }`}
              >
                <input
                  type="radio"
                  name="treatment_plan"
                  value={plan.id}
                  checked={selectedPlanId === plan.id}
                  onChange={() => onChange('treatment_plan_id', plan.id)}
                  className="mt-0.5 accent-[#004aad]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt">{plan.code}</span>
                    <span className="font-plex text-[10px] bg-ltcard2 border border-ltb text-lttm px-1.5 py-0.5 rounded-[4px]">
                      {plan.status}
                    </span>
                    {plan.zone_at_creation && (
                      <span className="font-plex text-[10px] text-lttm">
                        Zona {plan.zone_at_creation}
                        {plan.zone_target ? ` → ${plan.zone_target}` : ''}
                      </span>
                    )}
                  </div>
                  {(plan.actions_total ?? 0) > 0 && (
                    <div className="font-plex text-[11px] text-lttm">
                      {plan.actions_completed ?? 0}/{plan.actions_total} acciones completadas
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Descripción del tratamiento">
        <Textarea
          label="Resumen de medidas de tratamiento"
          value={str('treatment_summary')}
          onChange={(v) => onChange('treatment_summary', v)}
          placeholder="Describe las principales acciones adoptadas para mitigar o transferir los riesgos identificados: controles técnicos, procedimientos organizativos, formación, seguros…"
          rows={5}
          hint="Puede basarse en el plan de tratamiento FMEA o complementarlo."
        />
        <Textarea
          label="Riesgos residuales tras el tratamiento"
          value={str('residual_risk_description')}
          onChange={(v) => onChange('residual_risk_description', v)}
          placeholder="Describe los riesgos que permanecen tras aplicar las medidas de tratamiento y el nivel de aceptación acordado…"
          rows={3}
        />
        <Textarea
          label="Plan de monitoreo continuo"
          value={str('monitoring_plan')}
          onChange={(v) => onChange('monitoring_plan', v)}
          placeholder="Frecuencia de revisión, indicadores de alerta, responsables de seguimiento, proceso de reescalado…"
          rows={3}
        />
      </SectionCard>
    </div>
  );
}

function SectionS5({
  data, onChange,
}: {
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string) => String(data[key] ?? '');
  const bool = (key: string) => data[key] === true;

  return (
    <div className="space-y-5">
      <SectionCard title="Grupos afectados">
        <Textarea
          label="Personas y grupos directamente afectados"
          value={str('affected_groups')}
          onChange={(v) => onChange('affected_groups', v)}
          placeholder="Identifica quiénes pueden verse afectados por las decisiones o outputs del sistema: usuarios finales, empleados, clientes, ciudadanos…"
          rows={3}
        />
        <Toggle
          label="Afecta a colectivos vulnerables"
          value={bool('vulnerable_groups_affected')}
          onChange={(v) => onChange('vulnerable_groups_affected', v)}
          hint="Menores, personas con discapacidad, personas en situación de vulnerabilidad económica o social…"
        />
        {bool('vulnerable_groups_affected') && (
          <Textarea
            label="Descripción del impacto en colectivos vulnerables"
            value={str('vulnerable_groups_description')}
            onChange={(v) => onChange('vulnerable_groups_description', v)}
            placeholder="Explica cómo el sistema puede afectar específicamente a estos colectivos y qué salvaguardias existen…"
            rows={3}
          />
        )}
      </SectionCard>

      <SectionCard title="Derechos e impacto">
        <Textarea
          label="Derechos fundamentales potencialmente afectados"
          value={str('rights_impacted')}
          onChange={(v) => onChange('rights_impacted', v)}
          placeholder="p.ej. privacidad, no discriminación, debido proceso, libertad de expresión, acceso a servicios esenciales…"
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Severidad del impacto potencial"
            value={str('impact_severity')}
            onChange={(v) => onChange('impact_severity', v)}
            options={[
              { value: 'low',      label: 'Bajo — efectos menores y reversibles' },
              { value: 'medium',   label: 'Medio — efectos significativos' },
              { value: 'high',     label: 'Alto — efectos graves' },
              { value: 'critical', label: 'Crítico — efectos irreversibles o sistémicos' },
            ]}
          />
          <SelectField
            label="Probabilidad de materialización"
            value={str('impact_likelihood')}
            onChange={(v) => onChange('impact_likelihood', v)}
            options={[
              { value: 'low',    label: 'Baja' },
              { value: 'medium', label: 'Media' },
              { value: 'high',   label: 'Alta' },
            ]}
          />
        </div>
        <Textarea
          label="Descripción detallada del impacto"
          value={str('impact_description')}
          onChange={(v) => onChange('impact_description', v)}
          placeholder="Explica con detalle cómo el sistema puede causar o contribuir a impactos sobre personas concretas…"
          rows={5}
        />
        <Textarea
          label="Salvaguardias y medidas de protección"
          value={str('safeguards')}
          onChange={(v) => onChange('safeguards', v)}
          placeholder="Mecanismos de apelación, supervisión humana, posibilidad de opt-out, procedimientos de reclamación…"
          rows={3}
        />
      </SectionCard>
    </div>
  );
}

function SectionS6({
  data, onChange,
}: {
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const str = (key: string) => String(data[key] ?? '');

  return (
    <div className="space-y-5">
      <SectionCard title="Impacto social y ético">
        <Textarea
          label="Descripción del impacto social"
          value={str('social_impact_description')}
          onChange={(v) => onChange('social_impact_description', v)}
          placeholder="¿Cómo puede el sistema afectar a grupos sociales, mercados, dinámicas de poder o el acceso a oportunidades a escala colectiva?"
          rows={5}
        />
        <Textarea
          label="Evaluación del riesgo de sesgo y discriminación"
          value={str('bias_risk_assessment')}
          onChange={(v) => onChange('bias_risk_assessment', v)}
          placeholder="Describe los sesgos potenciales en datos o modelo, el impacto diferenciado por género, origen, edad u otras características protegidas, y las medidas de mitigación…"
          rows={4}
        />
      </SectionCard>

      <SectionCard title="Dimensiones adicionales">
        <Textarea
          label="Consideraciones medioambientales"
          value={str('environmental_consideration')}
          onChange={(v) => onChange('environmental_consideration', v)}
          placeholder="Huella de carbono del entrenamiento/inferencia, consumo energético, impacto en la sostenibilidad… (dejar vacío si no es relevante)"
          rows={3}
        />
        <Textarea
          label="Implicaciones sociales más amplias"
          value={str('broader_societal_implications')}
          onChange={(v) => onChange('broader_societal_implications', v)}
          placeholder="Efectos sobre el empleo, la autonomía humana, la concentración de poder, la democracia o el acceso a la información…"
          rows={3}
        />
        <Textarea
          label="Consulta a partes interesadas"
          value={str('stakeholder_consultation')}
          onChange={(v) => onChange('stakeholder_consultation', v)}
          placeholder="¿Se han consultado usuarios, afectados, DPO, comité de ética u otras partes? Describe el proceso y sus conclusiones…"
          rows={3}
        />
      </SectionCard>

      <SectionCard title="Conclusión">
        <Textarea
          label="Conclusión y valoración global"
          value={str('overall_conclusion')}
          onChange={(v) => onChange('overall_conclusion', v)}
          placeholder="Sintetiza la evaluación: ¿el sistema es aceptable desde una perspectiva de impacto IA? ¿Qué condiciones deben cumplirse? ¿Cuándo debe revisarse esta evaluación?"
          rows={5}
          hint="Esta conclusión es la base para la aprobación formal de la AISIA."
        />
      </SectionCard>
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

export function AisiaWizardClient({
  aisia,
  system,
  failureModes,
  treatmentPlans,
}: {
  aisia: AisiaAssessmentEntry;
  system: Record<string, unknown>;
  failureModes: FailureModeRow[];
  treatmentPlans: TreatmentPlanRow[];
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, startSaveTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Estado local de cada sección (inicializado desde la BD)
  const [sectionData, setSectionData] = useState<Record<string, Record<string, unknown>>>(() => {
    const init: Record<string, Record<string, unknown>> = {};
    for (const s of aisia.sections) {
      init[s.section_code] = s.data as Record<string, unknown>;
    }
    return init;
  });

  const [sectionStatuses, setSectionStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of aisia.sections) {
      init[s.section_code] = s.status;
    }
    return init;
  });

  const currentSection = SECTIONS[currentStep];
  const currentData = sectionData[currentSection.code] ?? {};

  const handleChange = useCallback((key: string, value: unknown) => {
    setSectionData((prev) => ({
      ...prev,
      [currentSection.code]: { ...prev[currentSection.code], [key]: value },
    }));
    // Marcar como in_progress si estaba pending
    if (sectionStatuses[currentSection.code] === 'pending') {
      setSectionStatuses((prev) => ({ ...prev, [currentSection.code]: 'in_progress' }));
    }
    setSavedAt(null);
  }, [currentSection.code, sectionStatuses]);

  const saveCurrentSection = useCallback(
    (markComplete = false) => {
      const data = sectionData[currentSection.code] ?? {};
      const status = markComplete ? 'complete' : (sectionStatuses[currentSection.code] === 'pending' ? 'in_progress' : sectionStatuses[currentSection.code]);

      startSaveTransition(async () => {
        setSaveError(null);
        const result = await updateAisiaSection(
          aisia.id,
          currentSection.code,
          data,
          status as 'pending' | 'in_progress' | 'complete'
        );
        if ('error' in result && result.error) {
          setSaveError(result.error);
        } else {
          setSavedAt(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
          if (markComplete) {
            setSectionStatuses((prev) => ({ ...prev, [currentSection.code]: 'complete' }));
          }
        }
      });
    },
    [aisia.id, currentSection.code, sectionData, sectionStatuses]
  );

  const goToStep = (step: number) => {
    saveCurrentSection(false);
    setCurrentStep(step);
    setSavedAt(null);
  };

  const handleSubmit = () => {
    startSubmitTransition(async () => {
      // Guardar sección actual antes de enviar
      await updateAisiaSection(
        aisia.id,
        currentSection.code,
        sectionData[currentSection.code] ?? {},
        'complete'
      );
      const result = await submitAisia(aisia.id);
      if ('error' in result && result.error) {
        setSaveError(result.error);
      } else {
        router.push(`/inventario/${aisia.ai_system_id}?tab=ISO+42001`);
      }
    });
  };

  const completedCount = Object.values(sectionStatuses).filter((s) => s === 'complete').length;
  const isLastStep = currentStep === SECTIONS.length - 1;

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 border-r border-ltb bg-ltcard overflow-y-auto">
        <div className="p-4">
          <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm font-semibold mb-3">
            Secciones
          </div>
          <div className="space-y-1">
            {SECTIONS.map((section, idx) => {
              const st = sectionStatuses[section.code] ?? 'pending';
              const visual = sectionStatusStyle(st);
              const isActive = idx === currentStep;
              return (
                <button
                  key={section.code}
                  onClick={() => goToStep(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-left transition-colors ${
                    isActive
                      ? 'bg-[#004aad] text-white'
                      : 'hover:bg-ltcard2 text-ltt'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-white/70' : visual.dot
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`font-plex text-[10px] font-semibold uppercase tracking-[0.6px] ${isActive ? 'text-white/70' : 'text-lttm'}`}>
                      {section.code}
                    </div>
                    <div className={`font-plex text-[12px] font-medium leading-tight ${isActive ? 'text-white' : ''}`}>
                      {section.short}
                    </div>
                  </div>
                  {st === 'complete' && !isActive && (
                    <span className="text-gr text-[12px]">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progreso global */}
          <div className="mt-5 pt-4 border-t border-ltb">
            <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">
              Progreso
            </div>
            <div className="flex gap-1">
              {SECTIONS.map((s) => {
                const st = sectionStatuses[s.code] ?? 'pending';
                return (
                  <div
                    key={s.code}
                    className={`h-1 flex-1 rounded-full ${
                      st === 'complete' ? 'bg-gr' : st === 'in_progress' ? 'bg-or' : 'bg-ltb'
                    }`}
                  />
                );
              })}
            </div>
            <div className="font-plex text-[11px] text-lttm mt-1.5">
              {completedCount} de {SECTIONS.length} completadas
            </div>
          </div>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header de sección */}
        <div className="border-b border-ltb bg-ltcard2 px-6 py-4 shrink-0">
          <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-0.5">
            {currentSection.code} de {SECTIONS.length}
          </div>
          <div className="font-fraunces text-[20px] font-semibold text-ltt">
            {currentSection.label}
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {currentStep === 0 && (
            <SectionS1 data={currentData} system={system} onChange={handleChange} />
          )}
          {currentStep === 1 && (
            <SectionS2 data={currentData} system={system} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <SectionS3 data={currentData} failureModes={failureModes} onChange={handleChange} />
          )}
          {currentStep === 3 && (
            <SectionS4 data={currentData} treatmentPlans={treatmentPlans} onChange={handleChange} />
          )}
          {currentStep === 4 && (
            <SectionS5 data={currentData} onChange={handleChange} />
          )}
          {currentStep === 5 && (
            <SectionS6 data={currentData} onChange={handleChange} />
          )}
        </div>

        {/* Footer de navegación */}
        <div className="border-t border-ltb bg-ltcard px-6 py-3 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => currentStep > 0 && goToStep(currentStep - 1)}
              disabled={currentStep === 0 || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] font-plex text-[12px] font-medium border border-ltb bg-ltcard2 text-ltt hover:bg-ltcard disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>

            {/* Estado de guardado */}
            <div className="font-plex text-[11.5px]">
              {isSaving && <span className="text-lttm">Guardando…</span>}
              {!isSaving && savedAt && <span className="text-gr">Guardado a las {savedAt}</span>}
              {!isSaving && saveError && <span className="text-re">{saveError}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => saveCurrentSection(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] font-plex text-[12px] font-medium border border-ltb bg-ltcard2 text-ltt hover:bg-ltcard disabled:opacity-60 transition-colors"
            >
              {isSaving ? 'Guardando…' : '✓ Marcar completa'}
            </button>

            {!isLastStep ? (
              <button
                onClick={() => {
                  saveCurrentSection(false);
                  setCurrentStep((s) => s + 1);
                  setSavedAt(null);
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[7px] font-plex text-[12px] font-medium bg-[#004aad] text-white hover:bg-[#0057cc] disabled:opacity-60 transition-colors"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[7px] font-plex text-[12px] font-medium bg-gr text-white hover:opacity-90 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? 'Enviando…' : 'Enviar para aprobación →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
