-- ============================================================================
-- Correccion del mapeo: latencia y escalabilidad son regulatorios
-- ============================================================================
-- Las habia clasificado como riesgo de negocio —«ingenieria con impacto de
-- coste»— y estaba equivocado en las dos.
--
-- LATENCIA (5 modos) → Art. 14, supervision humana.
--
--   En arquitecturas donde la supervision es sincrona o casi en tiempo real, la
--   latencia excesiva consume la ventana operativa y fuerza al sistema a decidir
--   sin validar, o a actuar sobre datos obsoletos. Eso no es un problema de
--   rendimiento: es supervision humana que deja de ser efectiva, que es
--   exactamente lo que el Art. 14 exige que sea.
--
-- ESCALABILIDAD (4 modos) → Art. 15.4, resiliencia.
--
--   El Art. 15.4 exige que los sistemas de alto riesgo sean «as resilient as
--   possible regarding errors, faults or inconsistencies that may occur within
--   the system or the environment in which the system operates», con soluciones
--   de redundancia tecnica que pueden incluir planes de respaldo o a prueba de
--   fallos. Un fallo catastrofico ante condiciones de estres cae ahi de lleno.
--
-- Confirmado tambien lo contrario: los 6 modos de `roi / Eficacia del modelo`
-- miden el valor que aporta al negocio, no la exactitud del modelo. Se quedan
-- como negocio y no se tocan.
--
-- El CSV del que se genera el mapeo ya esta actualizado. Esto va aparte y no
-- regenerando la migracion anterior, porque puede estar aplicada.
-- ============================================================================

UPDATE compliance.failure_modes
   SET origin = 'ai_act'
 WHERE dimension_id = 'tecnica'
   AND subcategoria IN ('Latencia', 'Escalabilidad')
   AND origin IS DISTINCT FROM 'ai_act';

INSERT INTO compliance.failure_mode_norm_refs
  (failure_mode_id, framework, reference, is_primary, confidence, note)
SELECT fm.id, 'ai_act', v.referencia, true, 'alta', v.nota
  FROM compliance.failure_modes fm
  JOIN (VALUES
    ('Latencia',     'Art. 14',
     'La latencia consume la ventana operativa de supervision y fuerza a decidir sin validar.'),
    ('Escalabilidad','Art. 15.4',
     'Resiliencia frente a fallos y sobrecargas: que el sistema no falle catastroficamente bajo estres.')
  ) AS v(subcategoria, referencia, nota)
    ON fm.subcategoria = v.subcategoria
 WHERE fm.dimension_id = 'tecnica'
ON CONFLICT (failure_mode_id, framework, reference) DO NOTHING;
