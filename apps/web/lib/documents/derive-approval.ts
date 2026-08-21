import 'server-only'

/**
 * Secciones derivadas de un acta de aprobación.
 *
 * Todo sale de lo que ya está registrado: la política congelada en la
 * solicitud y los votos, que son inmutables. Ninguna sección admite texto
 * manual — un acta que se pueda editar a mano no prueba nada, y esa es la
 * diferencia con el Anexo IV, donde lo manual es legítimo porque describe
 * decisiones de diseño.
 */

export type ApprovalContext = {
  request: {
    id:               string
    object_type:      string
    object_id:        string
    object_label:     string | null
    status:           string
    requested_at:     string
    closed_at:        string | null
    closed_reason:    string | null
    requested_by_name: string | null
    policy_snapshot:  Record<string, unknown>
  }
  decisions: Array<{
    position:       number
    decision:       string
    reason:         string | null
    decided_at:     string
    actor_name:     string | null
    on_behalf_name: string | null
  }>
  /** Solo cuando el objeto es un plan de tratamiento. */
  plan: { code: string | null; approval_level: string | null; accepted_risk_count: number | null } | null
}

const TIPO_OBJETO: Record<string, string> = {
  treatment_plan:   'Plan de tratamiento del riesgo',
  aisia_assessment: 'Evaluación de impacto AISIA',
  document:         'Documento regulatorio',
  soa:              'Declaración de Aplicabilidad',
  evidence:         'Evidencia',
}

const SENTIDO: Record<string, string> = {
  approved:  'a favor',
  rejected:  'en contra',
  abstained: 'abstención',
}

const RESULTADO: Record<string, string> = {
  approved:  'APROBADA',
  rejected:  'RECHAZADA',
  cancelled: 'CANCELADA',
  pending:   'EN CURSO',
}

const NIVEL: Record<string, string> = {
  level_1: 'Nivel 1',
  level_2: 'Nivel 2',
  level_3: 'Nivel 3 — riesgo residual alto',
}

function fecha(iso: string | null): string {
  if (!iso) return 'sin fecha'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function pasos(snapshot: Record<string, unknown>): Array<Record<string, unknown>> {
  const s = snapshot?.steps
  return Array.isArray(s) ? (s as Array<Record<string, unknown>>) : []
}

function describePaso(p: Record<string, unknown>): string {
  const tipo = String(p.approver_type ?? '')
  const ref = String(p.approver_ref ?? '')
  if (tipo === 'role') return `rol «${ref}»`
  if (tipo === 'profile') return 'persona designada'
  return `comité (quórum ${p.quorum ?? 1})`
}

export function deriveFromApproval(ref: string, ctx: ApprovalContext | null): string | null {
  if (!ctx) return null
  const { request, decisions, plan } = ctx

  switch (ref) {
    case 'ACTA.1.a': {
      const tipo = TIPO_OBJETO[request.object_type] ?? request.object_type
      const etiqueta = request.object_label ? ` correspondiente a «${request.object_label}»` : ''
      const codigo = plan?.code ? ` (referencia ${plan.code})` : ''
      return `${tipo}${etiqueta}${codigo}.`
    }

    case 'ACTA.1.b':
      return `Solicitud abierta por ${request.requested_by_name ?? 'un usuario del sistema'} `
        + `el ${fecha(request.requested_at)}, bajo la política «${request.policy_snapshot?.name ?? 'sin nombre'}».`

    case 'ACTA.2.a': {
      const lista = pasos(request.policy_snapshot)
      if (!lista.length) return null
      return lista
        .map((p) => `Paso ${p.position}: ${describePaso(p)}`
          + (p.allow_delegation === false ? ' · no admite delegación' : ''))
        .join('\n')
    }

    case 'ACTA.2.b':
      return request.policy_snapshot?.author_can_approve
        ? 'La política permitía expresamente que quien solicita la aprobación participase en ella. '
          + 'Es una excepción configurada, no un descuido, y consta como tal.'
        : 'Quien solicitó la aprobación no podía participar en ella. Segregación de funciones aplicada.'

    case 'ACTA.3.a': {
      if (!decisions.length) return 'No se registró ningún voto.'
      return decisions
        .map((d) => {
          const porCuenta = d.on_behalf_name ? `, por cuenta de ${d.on_behalf_name}` : ''
          return `Paso ${d.position} — ${d.actor_name ?? 'usuario no identificado'}${porCuenta}: `
            + `${SENTIDO[d.decision] ?? d.decision}, el ${fecha(d.decided_at)}.`
        })
        .join('\n')
    }

    case 'ACTA.3.b': {
      const motivos = decisions.filter((d) => d.reason?.trim())
      if (!motivos.length) return null
      return motivos
        .map((d) => `${d.actor_name ?? 'Usuario'} (${SENTIDO[d.decision] ?? d.decision}): «${d.reason}»`)
        .join('\n')
    }

    case 'ACTA.4.a': {
      const resultado = RESULTADO[request.status] ?? request.status
      const cierre = request.closed_at ? ` el ${fecha(request.closed_at)}` : ''
      const motivo = request.closed_reason ? ` Motivo: «${request.closed_reason}».` : ''
      return `Solicitud ${resultado}${cierre}.${motivo}`
    }

    case 'ACTA.4.b': {
      if (!plan) return null
      const nivel = plan.approval_level ? NIVEL[plan.approval_level] ?? plan.approval_level : 'sin nivel asignado'
      const aceptados = plan.accepted_risk_count ?? 0
      // Art. 9.5: el riesgo residual «is judged to be acceptable». Esta sección
      // es el registro de ese juicio, con quién lo emitió.
      return `${nivel}. El plan incorpora ${aceptados} riesgo(s) aceptado(s) sin mitigación adicional. `
        + (request.status === 'approved'
            ? 'La aprobación recogida en esta acta constituye el juicio de aceptabilidad del riesgo residual '
              + 'exigido por el artículo 9.5 del Reglamento (UE) 2024/1689.'
            : 'El riesgo residual no ha sido aceptado: la solicitud no terminó en aprobación.')
    }

    default:
      return null
  }
}
