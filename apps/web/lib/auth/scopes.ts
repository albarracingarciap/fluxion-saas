/**
 * Vocabulario de permisos para claves API (acceso máquina a máquina).
 *
 * Formato `recurso:acción`. Cada módulo recibe solo lo que necesita: si se
 * filtra la clave del monitor de drift, debe poder publicar señales y nada más.
 *
 * IMPORTANTE: un scope solo significa algo cuando existe un endpoint que lo
 * exige. Añadir aquí un valor no crea ninguna capacidad; solo lo hace visible
 * en la interfaz. No añadas scopes para módulos que aún no existen.
 */

export type ApiScope =
  | 'signals:write'
  | 'signals:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'connectors:sync'

export const API_SCOPES: ReadonlyArray<{
  value: ApiScope
  group: string
  label: string
  desc: string
}> = [
  {
    value: 'signals:write',
    group: 'Señales',
    label: 'Publicar señales',
    desc: 'Enviar eventos de monitorización. Es el permiso de los módulos de drift, telemetría y conectores.',
  },
  {
    value: 'signals:read',
    group: 'Señales',
    label: 'Leer señales',
    desc: 'Consultar las señales recibidas. Para cuadros de mando externos.',
  },
  {
    value: 'inventory:read',
    group: 'Inventario',
    label: 'Leer sistemas de IA',
    desc: 'Consultar el catálogo de sistemas y su clasificación.',
  },
  {
    value: 'inventory:write',
    group: 'Inventario',
    label: 'Escribir en inventario',
    desc: 'Registrar descubrimientos y actualizar metadatos de sistemas.',
  },
  {
    value: 'connectors:sync',
    group: 'Conectores',
    label: 'Sincronizar conectores',
    desc: 'Leer la configuración de las conexiones externas —incluidas sus credenciales— y reportar el resultado de cada sincronización. Concédelo solo a conectores.',
  },
]

/**
 * Permisos gruesos anteriores al modelo granular. Las claves emitidas antes
 * llevan uno de estos y deben seguir funcionando.
 */
const LEGACY_SCOPES = ['read', 'write', 'admin'] as const

export function isLegacyScope(scope: string): boolean {
  return (LEGACY_SCOPES as readonly string[]).includes(scope)
}

/**
 * ¿Los permisos de la clave cubren el que exige el endpoint?
 *
 * Equivalencias con el modelo antiguo:
 *   admin  → todo
 *   write  → cualquier `*:write` y cualquier `*:read`
 *   read   → cualquier `*:read`
 */
export function grantsScope(keyScopes: string[], required: string): boolean {
  if (keyScopes.includes(required)) return true
  if (keyScopes.includes('admin')) return true

  const action = required.split(':')[1]
  if (action === 'read') return keyScopes.includes('read') || keyScopes.includes('write')
  if (action === 'write') return keyScopes.includes('write')

  return false
}
