import { createFluxionClient } from '@/lib/supabase/fluxion'

export type EvidenceExpiryAlert = {
  id: string
  evidence_id: string
  alert_type: 'expiry_30d' | 'expiry_7d' | 'expired'
  evidence_title: string
  expires_at: string
  dismissed: boolean
  created_at: string
}

export async function getActiveExpiryAlerts(organizationId: string): Promise<EvidenceExpiryAlert[]> {
  const fluxion = createFluxionClient()

  const { data, error } = await fluxion
    .from('evidence_expiry_alerts')
    .select('id, evidence_id, alert_type, evidence_title, expires_at, dismissed, created_at')
    .eq('organization_id', organizationId)
    .eq('dismissed', false)
    .order('expires_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[getActiveExpiryAlerts]', error)
    return []
  }

  return (data ?? []) as EvidenceExpiryAlert[]
}
