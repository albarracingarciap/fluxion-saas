/**
 * Tablas del AI Act que usa el motor (B13a): Anexo I, Anexo III y textos.
 * Módulo puro.
 */
import type { AnnexIProduct, AnnexIIIPoint } from './types'

/** Sección del Anexo I de cada categoría de producto (RN-H04). */
export const ANNEX_I_SECTION: Record<AnnexIProduct, 'A' | 'B'> = {
  maquinaria: 'A', juguetes: 'A', embarcaciones_recreo: 'A', ascensores: 'A', atex: 'A',
  radioelectricos: 'A', presion: 'A', cable: 'A', epi: 'A', gas: 'A', sanitarios: 'A', sanitarios_iv: 'A',
  aviacion: 'B', dos_tres_ruedas: 'B', agricolas: 'B', marinos: 'B', motor_remolques: 'B',
  motor_seguridad: 'B', ferroviario: 'B',
}

/** Puntos del Anexo III: texto y dominio sugerido para el alta (RN-H10 a RN-H21, RN-W03). */
export const ANNEX_III: Record<AnnexIIIPoint, { label: string; rule: string; domain: string | null }> = {
  '1a': { label: 'Identificación biométrica remota', rule: 'RN-H10', domain: null },
  '1b': { label: 'Categorización biométrica', rule: 'RN-H11', domain: null },
  '1c': { label: 'Reconocimiento de emociones', rule: 'RN-H11', domain: null },
  '2':  { label: 'Infraestructuras críticas', rule: 'RN-H12', domain: 'infra' },
  '3a': { label: 'Educación: acceso o admisión', rule: 'RN-H13', domain: 'educacion' },
  '3b': { label: 'Educación: evaluación de resultados', rule: 'RN-H13', domain: 'educacion' },
  '3c': { label: 'Educación: nivel adecuado', rule: 'RN-H13', domain: 'educacion' },
  '3d': { label: 'Educación: vigilancia en exámenes', rule: 'RN-H13', domain: 'educacion' },
  '4a': { label: 'Empleo: contratación y selección', rule: 'RN-H14', domain: 'rrhh' },
  '4b': { label: 'Empleo: condiciones, promoción y despido', rule: 'RN-H14', domain: 'rrhh' },
  '5a': { label: 'Prestaciones y servicios públicos esenciales', rule: 'RN-H15', domain: 'otro' },
  '5b': { label: 'Solvencia y calificación crediticia', rule: 'RN-H16', domain: 'credito' },
  '5c': { label: 'Riesgos y precios en seguros de vida y salud', rule: 'RN-H17', domain: 'seguros' },
  '5d': { label: 'Llamadas de emergencia y triaje', rule: 'RN-H18', domain: 'seguridad' },
  '6a': { label: 'Garantía del Derecho: riesgo de ser víctima', rule: 'RN-H19', domain: 'seguridad' },
  '6b': { label: 'Garantía del Derecho: polígrafos', rule: 'RN-H19', domain: 'seguridad' },
  '6c': { label: 'Garantía del Derecho: fiabilidad de las pruebas', rule: 'RN-H19', domain: 'seguridad' },
  '6d': { label: 'Garantía del Derecho: riesgo de delinquir o reincidir', rule: 'RN-H19', domain: 'seguridad' },
  '6e': { label: 'Garantía del Derecho: elaboración de perfiles', rule: 'RN-H19', domain: 'seguridad' },
  '7a': { label: 'Migración: polígrafos', rule: 'RN-H20', domain: 'migracion' },
  '7b': { label: 'Migración: evaluación de riesgos', rule: 'RN-H20', domain: 'migracion' },
  '7c': { label: 'Migración: solicitudes de asilo, visados y permisos', rule: 'RN-H20', domain: 'migracion' },
  '7d': { label: 'Migración: detección e identificación', rule: 'RN-H20', domain: 'migracion' },
  '8a': { label: 'Administración de justicia', rule: 'RN-H21', domain: 'justicia' },
  '8b': { label: 'Procesos electorales', rule: 'RN-H21', domain: 'justicia' },
}

/** Práctica del Art. 5.1: letra y regla. */
export const PROHIBITED_PRACTICES = {
  subliminal:                { letter: 'a', rule: 'RN-P01', label: 'Técnicas subliminales o manipuladoras' },
  vulnerabilidades:          { letter: 'b', rule: 'RN-P02', label: 'Explotación de vulnerabilidades' },
  scoring_social:            { letter: 'c', rule: 'RN-P03', label: 'Puntuación social' },
  riesgo_delito:             { letter: 'd', rule: 'RN-P04', label: 'Predicción del riesgo de delinquir' },
  scraping_facial:           { letter: 'e', rule: 'RN-P05', label: 'Bases de reconocimiento facial por extracción masiva' },
  emociones:                 { letter: 'f', rule: 'RN-P06', label: 'Reconocimiento de emociones en el trabajo o la educación' },
  categorizacion_biometrica: { letter: 'g', rule: 'RN-P07', label: 'Categorización biométrica por atributos sensibles' },
  rbi_tiempo_real:           { letter: 'h', rule: 'RN-P08', label: 'Identificación biométrica remota en tiempo real' },
} as const

/** RN-P11: una práctica con excepción declarada se evalúa como supuesto del Anexo III. */
export const PRACTICE_EXCEPTION_TO_ANNEX_III: Partial<Record<keyof typeof PROHIBITED_PRACTICES, AnnexIIIPoint>> = {
  emociones: '1c',
  categorizacion_biometrica: '1b',
  rbi_tiempo_real: '1a',
  riesgo_delito: '6d',
}

export const LEVEL_LABELS: Record<string, string> = {
  prohibited: 'Práctica prohibida',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  pending: 'Pendiente de clasificar',
}
