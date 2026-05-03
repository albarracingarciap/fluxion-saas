-- 099: seed plantillas del sistema (scope = 'system', sin org ni owner)
-- Son de solo lectura desde la UI; se insertan una sola vez (ON CONFLICT DO NOTHING)

INSERT INTO fluxion.task_templates
  (organization_id, owner_id, scope, name, description, default_priority, default_tags, checklist)
VALUES
  -- ── Auditoría anual ISO 42001 ──────────────────────────────────────────────
  (NULL, NULL, 'system',
   'Auditoría anual ISO 42001',
   'Verificación completa del sistema de gestión de IA conforme a ISO 42001.',
   'critical',
   ARRAY['iso42001', 'auditoria'],
   '[
     {"label": "Revisar política de IA y objetivos del sistema de gestión", "required": true},
     {"label": "Verificar inventario de sistemas IA y clasificaciones de riesgo", "required": true},
     {"label": "Auditar registros de evaluación de riesgos"},
     {"label": "Revisar evidencia de formación y concienciación del personal"},
     {"label": "Comprobar registros de incidentes y acciones correctivas"},
     {"label": "Evaluar indicadores de rendimiento (KPIs) del sistema"},
     {"label": "Verificar cumplimiento con requisitos de partes interesadas"},
     {"label": "Preparar informe de auditoría y plan de acción"}
   ]'::jsonb),

  -- ── Revisión DPIA ─────────────────────────────────────────────────────────
  (NULL, NULL, 'system',
   'Revisión DPIA',
   'Evaluación de impacto relativa a la protección de datos (DPIA/EIPD) para sistemas con alto riesgo.',
   'high',
   ARRAY['dpia', 'privacidad', 'rgpd'],
   '[
     {"label": "Describir el procesamiento de datos y sus finalidades", "required": true},
     {"label": "Evaluar necesidad y proporcionalidad del tratamiento"},
     {"label": "Identificar y evaluar riesgos para los derechos de los interesados", "required": true},
     {"label": "Documentar medidas previstas para mitigar riesgos"},
     {"label": "Consultar con el DPO (Delegado de Protección de Datos)"},
     {"label": "Obtener aprobación del responsable del tratamiento"},
     {"label": "Registrar la DPIA en el registro de actividades"}
   ]'::jsonb),

  -- ── Verificación post-despliegue ──────────────────────────────────────────
  (NULL, NULL, 'system',
   'Verificación post-despliegue',
   'Checklist de verificación tras poner en producción un nuevo sistema IA o actualización mayor.',
   'high',
   ARRAY['despliegue', 'verificacion'],
   '[
     {"label": "Confirmar que las pruebas de aceptación han pasado satisfactoriamente", "required": true},
     {"label": "Verificar monitorización activa y alertas configuradas"},
     {"label": "Comprobar rollback plan documentado y probado"},
     {"label": "Revisar logs de sistema en las primeras 24h"},
     {"label": "Validar integridad de datos de entrada/salida"},
     {"label": "Confirmar notificación a partes interesadas"},
     {"label": "Actualizar inventario de sistemas IA"}
   ]'::jsonb),

  -- ── Investigación de incidente ────────────────────────────────────────────
  (NULL, NULL, 'system',
   'Investigación de incidente',
   'Proceso estándar de respuesta e investigación ante un incidente en un sistema IA.',
   'critical',
   ARRAY['incidente', 'investigacion'],
   '[
     {"label": "Registrar incidente: timestamp, sistema afectado y descripción", "required": true},
     {"label": "Contener el impacto (aislar sistema si es necesario)", "required": true},
     {"label": "Notificar al responsable del sistema y DPO si hay datos personales"},
     {"label": "Recopilar evidencias: logs, capturas, trazas"},
     {"label": "Analizar causa raíz"},
     {"label": "Definir y aplicar acciones correctivas"},
     {"label": "Verificar eficacia de las correcciones"},
     {"label": "Documentar lecciones aprendidas y cerrar el registro"}
   ]'::jsonb),

  -- ── Evaluación de proveedor IA ────────────────────────────────────────────
  (NULL, NULL, 'system',
   'Evaluación de proveedor IA',
   'Due diligence para proveedores y herramientas de IA de terceros.',
   'medium',
   ARRAY['proveedor', 'terceros'],
   '[
     {"label": "Revisar política de privacidad y DPA del proveedor", "required": true},
     {"label": "Evaluar certificaciones de seguridad (ISO 27001, SOC2, etc.)"},
     {"label": "Verificar ubicación y transferencia de datos (UE/EEE o garantías adecuadas)", "required": true},
     {"label": "Analizar dependencia y plan de contingencia ante baja del proveedor"},
     {"label": "Revisar SLA y tiempos de respuesta ante incidentes"},
     {"label": "Evaluar transparencia del modelo (explicabilidad, sesgos)"},
     {"label": "Registrar proveedor en el inventario de proveedores críticos"}
   ]'::jsonb)

ON CONFLICT DO NOTHING;
