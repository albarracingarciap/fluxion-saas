/**
 * Precarga de las secciones S1 y S2 de la AISIA con los datos de la ficha del
 * sistema (B08, E19).
 *
 * El asistente ya enseñaba estos valores, pero solo como valor por defecto en
 * pantalla: si nadie tocaba el campo, no se guardaba nada y la AISIA aprobada
 * quedaba sin esos datos. Ahora se guardan al crear la evaluación, con las
 * mismas equivalencias que usa el asistente.
 *
 * Módulo puro (sin Supabase ni Next).
 */

/** Columnas de `ai_systems` que hacen falta para la precarga. */
export const AISIA_PREFILL_SYSTEM_COLUMNS =
  'name, version, intended_use, prohibited_uses, technical_description, fully_automated, interacts_persons, '
  + 'processes_personal_data, data_categories, special_categories, data_volume, data_retention, dpia_completed'

type SystemRow = Record<string, unknown>

function texto(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s ? s : null
}

function lista(value: unknown): string | null {
  return Array.isArray(value) && value.length > 0 ? value.map(String).join(', ') : null
}

function sinVacios(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined))
}

export function buildAisiaPrefill(system: SystemRow): { S1: Record<string, unknown>; S2: Record<string, unknown> } {
  return {
    S1: sinVacios({
      system_name: texto(system.name),
      version: texto(system.version),
      intended_use: texto(system.intended_use),
      prohibited_uses: texto(system.prohibited_uses),
      technical_description: texto(system.technical_description),
      fully_automated: typeof system.fully_automated === 'boolean' ? system.fully_automated : null,
      interacts_persons: typeof system.interacts_persons === 'boolean' ? system.interacts_persons : null,
    }),
    S2: sinVacios({
      processes_personal_data: typeof system.processes_personal_data === 'boolean' ? system.processes_personal_data : null,
      data_categories_description: lista(system.data_categories),
      special_categories_description: lista(system.special_categories),
      data_volume: texto(system.data_volume),
      data_retention: texto(system.data_retention),
      dpia_status: texto(system.dpia_completed),
    }),
  }
}
