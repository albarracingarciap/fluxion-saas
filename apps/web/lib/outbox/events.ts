/**
 * Catálogo de eventos que Fluxion puede entregar.
 *
 * Fuente única, compartida por la pantalla de webhooks y por quien emite. Antes
 * la pantalla ofrecía diez eventos y **no se emitía ninguno**: se podía marcar
 * «Tarea completada» y esperar indefinidamente. Era una lista de deseos
 * presentada como un catálogo.
 *
 * `implemented` es lo que evita que eso vuelva a pasar. Un evento que todavía
 * no se emite se muestra, porque dice hacia dónde va el producto, pero se
 * muestra DICIÉNDOLO. Ofrecer algo que no llega nunca es peor que no ofrecerlo.
 *
 * Vive fuera de las acciones de servidor: un fichero `'use server'` solo puede
 * exportar funciones asíncronas.
 */

export type OutboxEventDef = {
  value:       string
  label:       string
  group:       string
  implemented: boolean
}

export const OUTBOX_EVENTS: OutboxEventDef[] = [
  // ── Aprobaciones ──────────────────────────────────────────────────────────
  { value: 'approval.pending',   label: 'Aprobación pendiente',  group: 'Aprobaciones', implemented: true },
  { value: 'approval.approved',  label: 'Aprobación concedida',  group: 'Aprobaciones', implemented: true },
  { value: 'approval.rejected',  label: 'Aprobación rechazada',  group: 'Aprobaciones', implemented: true },
  { value: 'approval.cancelled', label: 'Aprobación cancelada',  group: 'Aprobaciones', implemented: true },

  // ── Tareas ────────────────────────────────────────────────────────────────
  { value: 'task.completed',     label: 'Tarea completada',      group: 'Tareas',       implemented: true },

  // ── Todavía sin emisor ────────────────────────────────────────────────────
  { value: 'evaluation.completed', label: 'Evaluación completada', group: 'Evaluaciones', implemented: false },
  { value: 'evaluation.approved',  label: 'Evaluación aprobada',   group: 'Evaluaciones', implemented: false },
  { value: 'gap.created',          label: 'GAP creado',            group: 'Cumplimiento', implemented: false },
  { value: 'gap.closed',           label: 'GAP cerrado',           group: 'Cumplimiento', implemented: false },
  { value: 'system.created',       label: 'Sistema de IA creado',  group: 'Sistemas',     implemented: false },
  { value: 'member.invited',       label: 'Miembro invitado',      group: 'Miembros',     implemented: false },
  { value: 'member.role_changed',  label: 'Rol cambiado',          group: 'Miembros',     implemented: false },
  { value: 'member.deactivated',   label: 'Miembro desactivado',   group: 'Miembros',     implemented: false },
  { value: 'member.removed',       label: 'Miembro eliminado',     group: 'Miembros',     implemented: false },
]

export function eventoImplementado(value: string): boolean {
  return OUTBOX_EVENTS.find((e) => e.value === value)?.implemented ?? false
}
