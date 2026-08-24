-- ============================================================================
-- Inventario de obligaciones del Reglamento (UE) 2024/1689
-- ============================================================================
-- El catalogo tenia 19 obligaciones —9 del AI Act y 10 de ISO 42001— y con eso
-- no se puede responder a la pregunta que importa: que exige la norma que
-- nosotros no estemos cubriendo. El liston contra el que medir estaba
-- incompleto.
--
-- Titulos verificados contra el texto oficial. El detalle de cada uno, con a
-- quien obliga y por que se incluye, esta en
-- docs/producto/obligaciones-ai-act.csv.
--
-- Hallazgo de fondo al hacerlo: Fluxion IMPLEMENTA obligaciones que no
-- declaraba. Tiene plantilla de FRIA (Art. 27), modulo de incidentes con los
-- plazos del Art. 73 y pantalla de registro europeo (Art. 49), y ninguno de los
-- tres articulos estaba en el catalogo. El Art. 17 lo citan 34 modos de fallo.
-- ============================================================================


-- ── Paso 0 · La FRIA estaba numerada como Art. 72 ───────────────────────────
--
-- La fila AI-ACT-ART72 ES el articulo 27: su titulo dice «Evaluacion de impacto
-- de derechos fundamentales (FRIA)» y su descripcion habla de los desplegadores
-- antes del despliegue. Lo equivocado es el codigo y el numero.
--
-- El articulo 72 es vigilancia poscomercializacion, y se anade abajo: hoy no
-- existia porque su codigo estaba ocupado por este error.
--
-- Se renumera en lugar de borrar y recrear para no romper las filas de
-- obligation_evidence_types que cuelgan de este id: los tipos de evidencia
-- asociados se eligieron para la FRIA y siguen siendo correctos.

UPDATE compliance.obligations
   SET code = 'AI-ACT-ART27', article = 'Art. 27'
 WHERE code = 'AI-ACT-ART72'
   AND title LIKE '%FRIA%';


-- ── Paso 1 · Los articulos que faltaban ─────────────────────────────────────
--
-- `scope` acota a que sistemas aplica:
--   high_risk     alto riesgo (Anexo III o producto regulado)
--   all           cualquier sistema de IA
--   transparency  obligaciones de transparencia del Art. 50
--   gpai          modelos de proposito general (Capitulo V)

INSERT INTO compliance.obligations (code, framework, article, title, description, scope)
SELECT v.code, 'AI_ACT', v.article, v.title, v.description, v.scope
  FROM (VALUES
    ('AI-ACT-ART4', 'Art. 4',
     'Alfabetizacion en materia de IA',
     'Proveedores y responsables del despliegue deben garantizar un nivel suficiente de alfabetizacion en IA del personal que opera o usa los sistemas, atendiendo a su formacion, experiencia y al contexto de uso. En vigor desde febrero de 2025 y aplicable aunque el sistema no sea de alto riesgo.',
     'all'),

    ('AI-ACT-ART5', 'Art. 5',
     'Practicas de IA prohibidas',
     'Lista cerrada de practicas prohibidas: manipulacion subliminal, explotacion de vulnerabilidades, puntuacion social, prediccion de delitos por perfilado, extraccion masiva de imagenes faciales, inferencia de emociones en trabajo y educacion, categorizacion biometrica de caracteristicas protegidas e identificacion biometrica remota en tiempo real. Un sistema en esta lista no se mitiga: no se despliega.',
     'all'),

    ('AI-ACT-ART6', 'Art. 6',
     'Reglas de clasificacion de alto riesgo',
     'Determina cuando un sistema es de alto riesgo: como componente de seguridad de un producto regulado, o por figurar en el Anexo III. Incluye la excepcion del apartado 3 y el deber de documentar la evaluacion cuando el proveedor considere que no lo es.',
     'all'),

    ('AI-ACT-ART8', 'Art. 8',
     'Cumplimiento de los requisitos',
     'Los sistemas de alto riesgo deben cumplir los requisitos de la seccion 2, teniendo en cuenta su finalidad prevista y el estado de la tecnica.',
     'high_risk'),

    ('AI-ACT-ART17', 'Art. 17',
     'Sistema de gestion de la calidad',
     'El proveedor implanta un sistema de gestion de la calidad documentado que cubre, entre otros, la estrategia de cumplimiento, el control y verificacion del diseno, los procedimientos de examen y validacion, la gestion de modificaciones y un marco de rendicion de cuentas que fija las responsabilidades de la direccion y del personal.',
     'high_risk'),

    ('AI-ACT-ART18', 'Art. 18',
     'Conservacion de la documentacion',
     'El proveedor conserva la documentacion tecnica, la del sistema de gestion de la calidad, las decisiones de los organismos notificados y la declaracion UE de conformidad durante diez anos desde la introduccion en el mercado.',
     'high_risk'),

    ('AI-ACT-ART19', 'Art. 19',
     'Conservacion de los registros generados automaticamente',
     'El proveedor conserva los logs generados automaticamente por el sistema durante al menos seis meses, salvo que otra norma exija mas.',
     'high_risk'),

    ('AI-ACT-ART20', 'Art. 20',
     'Medidas correctivas y deber de informacion',
     'Ante un sistema no conforme, el proveedor adopta de inmediato las medidas correctivas necesarias —retirada, desactivacion o recuperacion— e informa a distribuidores, responsables del despliegue, representantes e importadores.',
     'high_risk'),

    ('AI-ACT-ART21', 'Art. 21',
     'Cooperacion con las autoridades competentes',
     'El proveedor facilita a la autoridad, previa peticion motivada, toda la informacion y documentacion necesarias para demostrar la conformidad, en una lengua oficial de la UE.',
     'high_risk'),

    ('AI-ACT-ART22', 'Art. 22',
     'Representantes autorizados de los proveedores',
     'Los proveedores establecidos fuera de la UE designan por mandato escrito un representante autorizado en la Union antes de comercializar el sistema.',
     'high_risk'),

    ('AI-ACT-ART23', 'Art. 23',
     'Obligaciones de los importadores',
     'Antes de introducir un sistema en el mercado, el importador verifica que se ha realizado la evaluacion de la conformidad, que existe documentacion tecnica y marcado CE, y que el proveedor ha designado representante.',
     'high_risk'),

    ('AI-ACT-ART24', 'Art. 24',
     'Obligaciones de los distribuidores',
     'El distribuidor verifica el marcado CE, la declaracion de conformidad y las instrucciones de uso antes de comercializar, y no lo hace si sabe o deberia saber que el sistema no es conforme.',
     'high_risk'),

    ('AI-ACT-ART25', 'Art. 25',
     'Responsabilidades a lo largo de la cadena de valor',
     'Define cuando un distribuidor, importador o responsable del despliegue pasa a considerarse PROVEEDOR: si pone su marca en el sistema, lo modifica sustancialmente o cambia su finalidad prevista. Regula tambien la informacion que el proveedor original debe facilitar.',
     'high_risk'),

    ('AI-ACT-ART26', 'Art. 26',
     'Obligaciones de los responsables del despliegue',
     'Usar el sistema conforme a las instrucciones, encomendar la supervision humana a personas con competencia, formacion y autoridad, vigilar el funcionamiento, conservar los registros al menos seis meses, informar a los trabajadores afectados y cooperar con las autoridades.',
     'high_risk'),

    ('AI-ACT-ART40', 'Art. 40',
     'Normas armonizadas',
     'Los sistemas conformes con normas armonizadas publicadas en el Diario Oficial se presumen conformes con los requisitos que esas normas cubren.',
     'high_risk'),

    ('AI-ACT-ART43', 'Art. 43',
     'Evaluacion de la conformidad',
     'Procedimiento aplicable segun el tipo de sistema: control interno o intervencion de un organismo notificado. Debe repetirse ante modificaciones sustanciales.',
     'high_risk'),

    ('AI-ACT-ART47', 'Art. 47',
     'Declaracion UE de conformidad',
     'El proveedor redacta una declaracion UE de conformidad por sistema, la conserva diez anos y la mantiene actualizada.',
     'high_risk'),

    ('AI-ACT-ART48', 'Art. 48',
     'Marcado CE',
     'El marcado CE se coloca de forma visible, legible e indeleble, o en su defecto en el embalaje o la documentacion, e incluye el numero del organismo notificado cuando proceda.',
     'high_risk'),

    ('AI-ACT-ART49', 'Art. 49',
     'Registro en la base de datos de la UE',
     'Antes de comercializar un sistema del Anexo III, el proveedor lo registra en la base de datos de la UE. Los responsables del despliegue que sean autoridades publicas tambien se registran.',
     'high_risk'),

    ('AI-ACT-ART50', 'Art. 50',
     'Obligaciones de transparencia de determinados sistemas',
     'Informar a las personas de que interactuan con una IA, marcar el contenido sintetico en formato legible por maquina, avisar del uso de reconocimiento de emociones o categorizacion biometrica y etiquetar las ultrafalsificaciones. Aplica aunque el sistema no sea de alto riesgo.',
     'transparency'),

    ('AI-ACT-ART53', 'Art. 53',
     'Obligaciones de los proveedores de modelos de proposito general',
     'Documentacion tecnica del modelo, informacion para los proveedores que lo integren, politica de cumplimiento de los derechos de autor y resumen suficientemente detallado de los contenidos usados para el entrenamiento.',
     'gpai'),

    ('AI-ACT-ART54', 'Art. 54',
     'Representantes autorizados de proveedores de modelos de proposito general',
     'Los proveedores de MPG establecidos fuera de la UE designan un representante autorizado en la Union.',
     'gpai'),

    ('AI-ACT-ART55', 'Art. 55',
     'Obligaciones de los modelos de proposito general con riesgo sistemico',
     'Evaluacion del modelo con pruebas adversariales, evaluacion y mitigacion de riesgos sistemicos, notificacion de incidentes graves y proteccion de la ciberseguridad del modelo.',
     'gpai'),

    ('AI-ACT-ART72', 'Art. 72',
     'Vigilancia poscomercializacion y plan de vigilancia',
     'El proveedor establece un sistema documentado de vigilancia poscomercializacion proporcionado a la naturaleza y los riesgos del sistema, que recoge y analiza datos de su funcionamiento a lo largo de toda su vida util, conforme a un plan que forma parte de la documentacion tecnica.',
     'high_risk'),

    ('AI-ACT-ART73', 'Art. 73',
     'Notificacion de incidentes graves',
     'El proveedor notifica a la autoridad de vigilancia del mercado los incidentes graves inmediatamente tras establecer el nexo causal, y a mas tardar en quince dias. Dos dias para infracciones generalizadas o interrupcion de infraestructura critica, y diez dias en caso de fallecimiento.',
     'high_risk'),

    ('AI-ACT-ART86', 'Art. 86',
     'Derecho a explicacion de decisiones individuales',
     'Toda persona afectada por una decision adoptada a partir de la salida de un sistema de alto riesgo del Anexo III que produzca efectos juridicos o le afecte significativamente tiene derecho a obtener del responsable del despliegue explicaciones claras y significativas sobre el papel que el sistema tuvo en esa decision.',
     'high_risk'),

    ('AI-ACT-ART87', 'Art. 87',
     'Denuncia de infracciones y proteccion del denunciante',
     'Las denuncias de infracciones del Reglamento se rigen por la Directiva (UE) 2019/1937 de proteccion de las personas que informan sobre infracciones del Derecho de la Union.',
     'all')
  ) AS v(code, article, title, description, scope)
 WHERE NOT EXISTS (
   SELECT 1 FROM compliance.obligations o WHERE o.code = v.code
 );
