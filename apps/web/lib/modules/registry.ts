/**
 * Catálogo de módulos de Fluxion.
 *
 * El Core —inventario, clasificación, FMEA, gaps, evidencias, SoA, tareas— no
 * es un módulo: está siempre. Un módulo es una capacidad que se despliega
 * aparte, se contrata aparte y puede no estar.
 *
 * OJO: aparecer en esta lista no concede nada. Un módulo está activo para una
 * organización si tiene fila en `fluxion.organization_modules` con
 * `status = 'enabled'` o `'trial'`. Esto es solo el vocabulario común entre la
 * base de datos, la interfaz y los servicios.
 */

export const MODULE_KEYS = [
  'connector-mlflow',
  'shadow-ai',
  'lineage',
  'ai-gateway',
  'telemetry',
  'drift-monitor',
  'doc-engine',
  'hitl',
  'approvals',
  'itsm',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

export type ModuleStatus = 'enabled' | 'disabled' | 'trial'

export const MODULE_CATALOG: ReadonlyArray<{
  key: ModuleKey
  name: string
  group: 'Integración' | 'Supervisión' | 'Cumplimiento'
  desc: string
}> = [
  {
    key: 'connector-mlflow',
    name: 'Conector MLOps',
    group: 'Integración',
    desc: 'Sincroniza modelos, versiones y métricas desde MLflow hacia el inventario.',
  },
  {
    key: 'shadow-ai',
    name: 'Detección de Shadow AI',
    group: 'Integración',
    desc: 'Descubre usos de IA no declarados analizando repositorios de código.',
  },
  {
    key: 'lineage',
    name: 'Linaje de datos y modelos',
    group: 'Integración',
    desc: 'Traza el recorrido de los datos hasta el modelo y propaga obligaciones.',
  },
  {
    key: 'ai-gateway',
    name: 'AI Gateway',
    group: 'Supervisión',
    desc: 'Intercepta prompts y respuestas: inyecciones, PII y contenido tóxico.',
  },
  {
    key: 'telemetry',
    name: 'Telemetría y evaluación',
    group: 'Supervisión',
    desc: 'Trazas de ejecución, coste por token y calidad de sistemas RAG.',
  },
  {
    key: 'drift-monitor',
    name: 'Deriva y equidad',
    group: 'Supervisión',
    desc: 'Detecta desplazamiento de datos, caída de rendimiento y sesgos.',
  },
  {
    key: 'doc-engine',
    name: 'Documentación regulatoria',
    group: 'Cumplimiento',
    desc: 'Model cards, DPIA, FRIA, Anexo IV y paquetes de auditoría.',
  },
  {
    key: 'hitl',
    name: 'Auditoría de discordancias',
    group: 'Cumplimiento',
    desc: 'Registra por qué un humano rechaza la sugerencia de un sistema de IA.',
  },
  {
    key: 'approvals',
    name: 'Flujos de aprobación',
    group: 'Cumplimiento',
    desc: 'Aprobaciones multinivel configurables sobre planes y decisiones.',
  },
  {
    key: 'itsm',
    name: 'Incidentes e ITSM',
    group: 'Cumplimiento',
    desc: 'Sincroniza incidentes de IA con Jira, ServiceNow, Slack o Teams.',
  },
]

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value)
}
