-- ============================================================================
-- Permisos de escritura sobre las estimaciones por familia
-- ============================================================================
-- La tabla se creo concediendo solo SELECT a `authenticated`, y la accion de
-- servidor escribe con el cliente DEL USUARIO, no con el de servicio — igual
-- que el resto del FMEA. Resultado: «permission denied for table
-- fmea_family_estimates» al aplicar la primera estimacion.
--
-- La alternativa era escribir con rol de servicio, pero eso sacaria estas
-- escrituras del mismo control que las demas del modulo. Se concede escritura a
-- `authenticated` con su politica, que es como funciona todo lo que hay
-- alrededor.
--
-- La comprobacion de que la evaluacion sigue siendo editable la hace
-- `requireEditableEvaluation` en la accion: la RLS no puede expresar «el estado
-- es draft o in_review» sin duplicar esa regla aqui.

GRANT INSERT, UPDATE, DELETE ON fluxion.fmea_family_estimates TO authenticated;

DROP POLICY IF EXISTS fmea_family_estimates_write ON fluxion.fmea_family_estimates;

CREATE POLICY fmea_family_estimates_write ON fluxion.fmea_family_estimates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
       WHERE e.id = evaluation_id
         AND e.organization_id = fluxion.auth_user_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.fmea_evaluations e
       WHERE e.id = evaluation_id
         AND e.organization_id = fluxion.auth_user_org_id()
    )
  );
