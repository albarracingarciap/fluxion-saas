import { notFound } from 'next/navigation'

import { getCommitteeSession } from '../../sesiones-actions'
import { SesionClient } from './sesion-client'

export const dynamic = 'force-dynamic'

/** Sesión de comité: orden del día, asistentes, acta y acuerdos (B20b). */
export default async function SesionComitePage({ params }: { params: { id: string } }) {
  const session = await getCommitteeSession(params.id)
  if ('error' in session) notFound()
  return <SesionClient session={session} />
}
