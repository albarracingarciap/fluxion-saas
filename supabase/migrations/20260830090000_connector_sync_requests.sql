-- ============================================================================
-- Sincronizacion manual de conectores
-- ============================================================================
-- Una conexion recien creada no se puede validar hasta la siguiente pasada del
-- conector. En el de Shadow AI eso es un dia entero: configuras las
-- credenciales y no sabes si son correctas hasta manana.
--
-- El Core NO puede llamar a los conectores: son procesos en bucle, sin puerto
-- expuesto ni ingress. Inventar un camino de red solo para esto seria abrir
-- superficie a cambio de un boton.
--
-- Asi que se mantiene el modelo que ya existe —el conector pregunta, el Core
-- responde— y se anade una marca: «alguien ha pedido una pasada». El conector
-- la ve en su consulta de configuracion y adelanta el ciclo.
--
-- Se limpia sola: al reportar una pasada iniciada despues de la peticion, la
-- marca se borra. Una peticion hecha mientras la pasada ya estaba en curso NO
-- se pierde, porque esa pasada empezo antes y no la cancela.

ALTER TABLE fluxion.connector_connections
  ADD COLUMN IF NOT EXISTS sync_requested_at timestamptz;

COMMENT ON COLUMN fluxion.connector_connections.sync_requested_at IS
  'Momento en que se pidio una sincronizacion manual. El conector lo lee en su '
  'consulta de configuracion y adelanta el ciclo. Se borra al reportar una '
  'pasada iniciada despues de esta marca.';
