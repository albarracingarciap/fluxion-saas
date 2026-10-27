-- ============================================================================
-- Gaps: excluir una «Obligación sin cubrir» excluye la obligación (B17d, F-14)
-- ============================================================================
--   Desde B17d, la exclusión activa de un gap de la capa normativa marca su
--   obligación como Excluida, y revertirla la devuelve a Pendiente. Las
--   exclusiones activas anteriores no lo hicieron: la obligación seguía abierta
--   en la ficha aunque el gap no apareciera. Se alinean aquí.
--
--   Las exclusiones activas de «Riesgo sin tratar» y «Control sin implantar»
--   (que desde B17d se resuelven en el plan y no se excluyen) se conservan; se
--   pueden reactivar desde Brechas excluidas.
--
-- Idempotente.
-- ============================================================================

UPDATE fluxion.system_obligations o
   SET status = 'excluded',
       exclusion_justification = coalesce(o.exclusion_justification, d.rationale),
       notes = coalesce(o.notes, d.rationale),
       resolved_at = coalesce(o.resolved_at, d.decided_at)
  FROM fluxion.gap_dispositions d
 WHERE d.gap_layer = 'normativo'
   AND d.status = 'active'
   AND (d.expires_at IS NULL OR d.expires_at > now())
   AND d.gap_source_id = o.id
   AND d.organization_id = o.organization_id
   AND o.status NOT IN ('excluded', 'resolved');
