// Esquema del cuestionario preliminar de sistemas de IA.
//
// Las respuestas se guardan en un jsonb (fluxion.preliminary_questionnaires.answers)
// con la clave de cada campo. Por eso las claves son estables: cambiar el
// texto de una pregunta es libre, cambiar su `key` deja huérfanas las
// respuestas ya guardadas.
//
// Convenciones de almacenamiento:
//   text/textarea/date/radio  -> string
//   yesno                     -> 'si' | 'no' | 'na'
//   yesno con `detail`        -> además `${key}__detalle` (string)
//   checks                    -> string[] con los `value` marcados; «Ninguno de los
//                                anteriores» se guarda como NONE (RN-V02, B13b)
//
// `showIf` oculta un campo que no aplica; un campo oculto no se exige.

export type Option = { value: string; label: string }

type Base = {
  key: string
  label: string
  hint?: string
  required?: boolean
  /** Solo se muestra (y se exige) si se cumple (B13b). */
  showIf?: (a: Answers) => boolean
}

/** Valor de «Ninguno de los anteriores» en un campo de casillas (RN-V02). */
export const NONE = '__ninguno'

export type Field =
  | (Base & { type: 'text' | 'textarea' | 'date'; placeholder?: string })
  | (Base & { type: 'radio'; options: Option[] })
  | (Base & {
      type: 'yesno'
      naLabel?: string
      /** `onlyIfYes`: el detalle solo se pide con «Sí» (RN-V10). */
      detail?: { label: string; required?: boolean; placeholder?: string; onlyIfYes?: boolean }
    })
  | (Base & {
      type: 'checks'
      options: Option[]
      columns?: 1 | 2
      /** Opción excluyente «Ninguno de los anteriores» (RN-V02). */
      noneLabel?: string
    })

export type Block = {
  heading?: string
  description?: string
  fields: Field[]
  /** Solo se muestra si se cumple (B13b). */
  showIf?: (a: Answers) => boolean
}

export type Section = {
  id: string
  title: string
  description: string
  blocks: Block[]
}

export type Answers = Record<string, string | string[] | undefined>

const list = (a: Answers, k: string): string[] => (Array.isArray(a[k]) ? (a[k] as string[]) : [])
const has = (a: Answers, k: string, v: string) => list(a, k).includes(v)

/** Grupos del Anexo III (bloque B de la clase 2). */
export const C2B_KEYS = [
  'c2b_biometria', 'c2b_infra', 'c2b_educacion', 'c2b_empleo', 'c2b_asistencia', 'c2b_solvencia',
  'c2b_seguros', 'c2b_emergencias', 'c2b_ley', 'c2b_migracion', 'c2b_justicia',
] as const

/** Algún supuesto del Anexo III marcado (Q-06 y Q-11 solo aparecen entonces). */
export const tieneAnexoIII = (a: Answers) => C2B_KEYS.some((k) => list(a, k).some((v) => v !== NONE))
/** Algún supuesto del Anexo I marcado. */
const tieneAnexoI = (a: Answers) => list(a, 'c2a').some((v) => v !== NONE)

const NA_PROPIO = 'No aplica, es un desarrollo propio y no se utiliza ningún modelo de terceros.'
const NA_CLIENTE = 'No aplica, el sistema de IA es adquirido directamente por el cliente.'

const opts = (...pairs: [string, string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }))

export const SECTIONS: Section[] = [
  {
    id: 'proyecto',
    title: 'Proyecto',
    description: 'Información preliminar sobre el proyecto u oportunidad. Uso interno: no debe remitirse fuera de la organización.',
    blocks: [
      {
        fields: [
          { type: 'text', key: 'responsable', label: 'Responsable del proyecto', required: true },
          {
            type: 'radio', key: 'mercado_corporativo', label: 'Mercado / Corporativo', required: true,
            options: opts(['mercado', 'Mercado'], ['corporativo', 'Corporativo']),
          },
          {
            type: 'text', key: 'mercado_detalle', label: 'Mercado afectado o área corporativa',
            hint: 'Indica el mercado afectado si es de mercado, o el área si es corporativo.',
          },
          { type: 'text', key: 'cliente', label: 'Cliente', hint: 'Si el proyecto es de mercado.' },
          { type: 'text', key: 'empresa_grupo', label: 'Empresa del grupo', hint: 'La empresa del grupo que lleva el proyecto.' },
        ],
      },
    ],
  },
  {
    id: 'tratamiento',
    title: 'Información básica',
    description: 'Información básica sobre el tratamiento y el uso de la IA.',
    blocks: [
      {
        fields: [
          {
            type: 'radio', key: 'q1_tipo', label: '1. ¿Se trata de un proyecto o de una oportunidad?', required: true,
            options: opts(['proyecto', 'Proyecto'], ['oportunidad', 'Oportunidad']),
          },
          { type: 'textarea', key: 'q2_objeto', label: '2. Objeto del proyecto / oportunidad', hint: 'Especifica de forma clara y precisa el objeto.', required: true },
          {
            type: 'yesno', key: 'q3_datos_personales', label: '3. ¿Se van a tratar datos personales en la prestación de los servicios?', required: true,
            detail: { label: 'Datos personales objeto del tratamiento', required: true, onlyIfYes: true },
          },
          {
            type: 'yesno', key: 'q4_usa_ia', label: '4. ¿Se va a utilizar tecnología IA en el proyecto / oportunidad?', required: true,
            // Q-13: la definición del Art. 3.1, para no marcar «Sí» por cualquier automatización.
            hint: 'Sistema de IA (AI Act, Art. 3.1): sistema basado en una máquina, diseñado para funcionar con distintos niveles de autonomía, que puede mostrar capacidad de adaptación tras el despliegue y que, para objetivos explícitos o implícitos, infiere de la información de entrada que recibe la manera de generar resultados (predicciones, contenidos, recomendaciones o decisiones) que pueden influir en entornos físicos o virtuales. Una automatización por reglas fijas no lo es.',
          },
          { type: 'text', key: 'q5_tecnologia', label: '5. ¿Qué tecnología se va a utilizar?', hint: 'Nombre de la IA.' },
          {
            type: 'yesno', key: 'q6_autoriza', label: '6. ¿El cliente ha autorizado el uso de IA?', naLabel: 'No aplica',
            detail: { label: 'Nombre del cliente', onlyIfYes: true },
          },
          { type: 'yesno', key: 'q7_contrato', label: '7. ¿En el contrato con el cliente se hace referencia al uso de tecnología IA?', naLabel: 'No aplica' },
          { type: 'textarea', key: 'q8_uso', label: '8. Describe de forma precisa y clara el uso que se va a hacer de la IA' },
          {
            type: 'textarea', key: 'q9_infra', label: '9. ¿Sobre qué infraestructura se van a prestar los servicios?',
            hint: 'Indica si es del cliente o propia, y su nombre (por ejemplo, Azure del cliente).',
          },
          {
            type: 'checks', key: 'q10_exclusiones', columns: 1,
            label: '10. ¿El sistema de IA se encuentra dentro de alguna de estas categorías?',
            hint: 'Si no se marca ninguna, no aplica ninguna exclusión.',
            options: opts(
              ['militar', 'Sistemas de IA desarrollados y utilizados exclusivamente con fines militares o de estrategia nacional'],
              ['cooperacion', 'Sistemas de IA utilizados por autoridades públicas u organizaciones internacionales en terceros países para la cooperación policial y judicial'],
              ['id', 'Actividades de investigación y desarrollo de la IA'],
              ['open_source', 'Componentes de inteligencia artificial con licencias libres y de código abierto'],
              // Q-09: sustituye a `profesional` («actividades exclusivamente profesionales»),
              // que decía lo contrario del Art. 2.10 y no se trata como exclusión.
              ['uso_personal', 'Uso por personas físicas en el marco de una actividad puramente personal de carácter no profesional'],
            ),
          },
        ],
      },
    ],
  },
  {
    id: 'sistema',
    title: 'Sistema de IA',
    description: 'Propiedad del sistema, proveedor y estado de análisis.',
    blocks: [
      {
        heading: 'Propiedad del sistema de IA',
        fields: [
          {
            type: 'radio', key: 'propiedad', label: 'Señala la opción que corresponda', required: true,
            options: opts(
              ['tercero_cliente', 'El sistema de IA es de un tercero (Microsoft, AWS…) adquirido por el cliente'],
              ['tercero_organizacion', 'El sistema de IA es de un tercero (Microsoft, AWS…) adquirido por la organización'],
              ['propio_organizacion', 'El sistema va a ser un desarrollo propio cuya propiedad intelectual será de la organización'],
              ['propio_cliente', 'El sistema va a ser un desarrollo propio para un cliente cuya propiedad intelectual pertenecerá al cliente'],
            ),
          },
        ],
      },
      {
        heading: 'Proveedor del sistema de IA',
        description: 'En su caso.',
        fields: [
          { type: 'text', key: 'prov_nombre_comercial', label: 'Nombre comercial de la IA y versión' },
          { type: 'text', key: 'prov_nombre', label: 'Nombre del proveedor de IA' },
          { type: 'yesno', key: 'prov_grupo_internacional', label: '¿El proveedor pertenece a un grupo internacional?', naLabel: 'No aplica' },
          { type: 'yesno', key: 'prov_matriz_extranjera', label: '¿La matriz es extranjera? (fuera del Espacio Económico Europeo)', naLabel: 'No aplica' },
          { type: 'yesno', key: 'prov_en_europa', label: '¿La empresa proveedora se encuentra en Europa?', naLabel: 'No aplica' },
          { type: 'text', key: 'prov_pais', label: 'País' },
        ],
      },
      {
        heading: 'Estado de análisis del sistema de IA',
        fields: [
          { type: 'yesno', key: 'est_homologado', label: '¿El proveedor está homologado?', naLabel: NA_CLIENTE },
          {
            type: 'yesno', key: 'est_licencia', label: '¿Se han revisado los términos de la licencia de uso ofrecidos por el proveedor?', naLabel: NA_PROPIO,
            detail: { label: 'Contrato', placeholder: 'Referencia o enlace al contrato' },
          },
          {
            type: 'yesno', key: 'est_doc_tecnica', label: '¿Se tiene identificada y disponible la documentación técnica ofrecida por el proveedor?', naLabel: NA_CLIENTE,
            detail: { label: 'Comentarios', required: true },
          },
          {
            type: 'yesno', key: 'est_instrucciones', label: '¿Se tienen identificadas y disponibles las instrucciones de uso que deben acompañar al sistema?', naLabel: NA_CLIENTE,
            detail: { label: 'Comentarios', required: true },
          },
        ],
      },
    ],
  },
  {
    id: 'finalidad',
    title: 'Finalidad prevista',
    description: 'Ámbitos en los que está prevista la utilización del sistema de IA. Marca todos los que correspondan.',
    blocks: [
      {
        heading: 'Supuestos clase 1 · Bloque A',
        description: 'Prácticas de IA prohibidas.',
        fields: [
          {
            type: 'checks', key: 'c1', label: 'Prácticas', required: true,
            noneLabel: 'Ninguna de las anteriores',
            options: opts(
              ['subliminal', 'Técnicas subliminales o manipuladoras asistidas por IA para influir en una decisión que de otro modo no se habría tomado, de modo que provoque o sea posible que provoque perjuicios considerables a esa persona o grupo de personas'],
              ['vulnerabilidades', 'Explotación de vulnerabilidades basadas en la edad, discapacidad o situaciones sociales o económicas específicas para distorsionar el comportamiento y causar o poder causar daños significativos'],
              ['categorizacion_biometrica', 'Sistemas de categorización biométrica para deducir o inferir información personal sensible (raza, opinión política, afiliación sindical, religión, creencias filosóficas, vida u orientación sexuales)'],
              ['rbi_tiempo_real', 'IA de identificación biométrica remota «en tiempo real» en espacios de acceso público con fines de aplicación de la ley'],
              ['riesgo_delito', 'IA para evaluar o predecir la probabilidad de que una persona física cometa una infracción penal basándose únicamente en la elaboración de su perfil o en la evaluación de los rasgos y características de su personalidad'],
              ['scraping_facial', 'IA que cree o amplíe bases de datos de reconocimiento facial mediante la extracción no selectiva de imágenes faciales de internet o de circuitos cerrados de televisión'],
              ['emociones', 'IA para inferir las emociones de una persona física en los lugares de trabajo y en los centros educativos'],
              ['scoring_social', 'Evaluación o clasificación de individuos o grupos basada en el comportamiento social o las características personales, que conduzca a un trato perjudicial o desfavorable en contextos distintos a los de la recopilación original, o desproporcionado respecto a su comportamiento o gravedad'],
            ),
          },
          // Q-02: excepciones del Art. 5.1. Con «Sí» y su justificación, la práctica
          // deja de ser prohibida y se evalúa como supuesto del Anexo III (RN-P11).
          {
            type: 'yesno', key: 'c1_exc_riesgo_delito', showIf: (a) => has(a, 'c1', 'riesgo_delito'),
            label: 'Excepción (Art. 5.1.d): ¿el sistema solo apoya una valoración humana basada en hechos objetivos y verificables directamente relacionados con una actividad delictiva?',
            detail: { label: 'Justificación', required: true, onlyIfYes: true },
          },
          {
            type: 'yesno', key: 'c1_exc_emociones', showIf: (a) => has(a, 'c1', 'emociones'),
            label: 'Excepción (Art. 5.1.f): ¿se usa por motivos médicos o de seguridad?',
            detail: { label: 'Justificación', required: true, onlyIfYes: true },
          },
          {
            type: 'yesno', key: 'c1_exc_categorizacion_biometrica', showIf: (a) => has(a, 'c1', 'categorizacion_biometrica'),
            label: 'Excepción (Art. 5.1.g): ¿se limita al etiquetado o filtrado de conjuntos de datos biométricos adquiridos lícitamente, en el ámbito de la aplicación de la ley?',
            detail: { label: 'Justificación', required: true, onlyIfYes: true },
          },
          {
            type: 'yesno', key: 'c1_exc_rbi_tiempo_real', showIf: (a) => has(a, 'c1', 'rbi_tiempo_real'),
            label: 'Excepción (Art. 5.1.h): ¿se usa en uno de los supuestos tasados del Art. 5.1.h, con la autorización previa de los Art. 5.2 a 5.7?',
            detail: { label: 'Justificación', required: true, onlyIfYes: true },
          },
        ],
      },
      {
        heading: 'Supuestos clase 2 · Bloque A',
        description: 'Componente de seguridad de un producto o producto sujeto a legislación de armonización.',
        fields: [
          {
            type: 'checks', key: 'c2a', label: 'Supuestos', required: true,
            noneLabel: 'Ninguno de los anteriores',
            options: opts(
              ['componente_seguridad', 'El sistema de IA está destinado a ser utilizado como componente de seguridad de un producto (componente que cumple una función de seguridad o cuyo fallo pone en peligro la salud y seguridad de las personas o los bienes)'],
              // Q-03: separado del componente de seguridad (Art. 6.1.a).
              ['producto', 'El sistema de IA es en sí mismo un producto regulado por la legislación de armonización del Anexo I'],
              ['evaluacion_terceros', 'El producto del que el sistema es componente de seguridad, o el propio sistema como producto, debe someterse a una evaluación de la conformidad de terceros para su introducción en el mercado o puesta en servicio'],
            ),
          },
          {
            type: 'checks', key: 'c2a_productos', columns: 2, showIf: tieneAnexoI,
            label: 'Si has marcado alguna opción anterior, indica a qué categorías de producto afecta',
            options: opts(
              ['maquinaria', 'Maquinaria'],
              ['juguetes', 'Juguetes'],
              ['embarcaciones_recreo', 'Embarcaciones de recreo y motos acuáticas'],
              ['ascensores', 'Ascensores y componentes de seguridad para ascensores'],
              ['atex', 'Aparatos y sistemas de protección para uso en atmósferas potencialmente explosivas'],
              ['radioelectricos', 'Equipos radioeléctricos'],
              ['presion', 'Equipos a presión'],
              ['cable', 'Instalaciones de transporte por cable'],
              ['epi', 'Equipos de protección individual'],
              ['gas', 'Aparatos que queman combustibles gaseosos'],
              ['sanitarios', 'Productos sanitarios'],
              ['sanitarios_iv', 'Productos sanitarios para diagnóstico in vitro'],
              ['aviacion', 'Aviación civil'],
              ['dos_tres_ruedas', 'Homologación de vehículos de dos o tres ruedas y cuatriciclos'],
              ['agricolas', 'Vehículos agrícolas o forestales'],
              ['marinos', 'Equipos marinos'],
              ['motor_remolques', 'Vehículos de motor y sus remolques y unidades técnicas independientes destinados a dichos vehículos'],
              ['motor_seguridad', 'Vehículos de motor y sus remolques, sistemas, componentes y unidades técnicas independientes, en lo que respecta a su seguridad general y a la protección de los ocupantes y de los usuarios vulnerables de la vía pública'],
              ['ferroviario', 'Interoperabilidad del sistema ferroviario'],
            ),
          },
        ],
      },
      {
        heading: 'Supuestos clase 2 · Bloque B',
        description: 'Ámbitos de alto riesgo (Anexo III). Si no aplica ninguno, márcalo abajo: sin respuesta no equivale a «no».',
        fields: [
          {
            type: 'checks', key: 'c2b_biometria', label: 'Identificación por biometría remota',
            options: opts(
              ['identificacion', 'Identificación biométrica de personas físicas, cuando la única finalidad no sea la autenticación'],
              ['conclusiones_biometricas', 'Extracción de conclusiones sobre las características personales de las personas físicas a partir de datos biométricos o basados en la biometría, incluidos los sistemas de reconocimiento de emociones'],
            ),
          },
          {
            type: 'checks', key: 'c2b_infra', label: 'Gestión y operación de infraestructuras críticas',
            options: opts(
              // Q-04: texto del Anexo III, punto 2.
              ['componente_seguridad', 'Componentes de seguridad en la gestión y el funcionamiento de infraestructuras digitales críticas, del tráfico rodado o del suministro de agua, gas, calefacción o electricidad'],
            ),
          },
          {
            type: 'checks', key: 'c2b_educacion', label: 'Educación y formación profesional',
            options: opts(
              ['acceso', 'Determinar el acceso o la admisión de personas físicas a centros educativos y de formación profesional a todos los niveles, o distribuirlas entre ellos'],
              ['resultados', 'Evaluar los resultados del aprendizaje, en particular cuando se utilicen para orientar el proceso de aprendizaje'],
              ['nivel', 'Evaluar el nivel de educación adecuado que recibirá una persona o al que podrá acceder'],
              ['examenes', 'Seguimiento y detección de comportamientos prohibidos de los estudiantes durante los exámenes'],
            ),
          },
          {
            type: 'checks', key: 'c2b_empleo', label: 'Empleo, gestión de los trabajadores y acceso al autoempleo',
            options: opts(
              ['seleccion', 'Contratación o selección de personas físicas, en particular publicar anuncios de empleo específicos, analizar y filtrar solicitudes y evaluar candidatos'],
              ['condiciones', 'Decisiones que afecten a las condiciones laborales, a la promoción o rescisión de relaciones contractuales, a la asignación de tareas a partir de comportamientos individuales o rasgos personales, o a la supervisión y evaluación del rendimiento y comportamiento'],
            ),
          },
          {
            type: 'checks', key: 'c2b_asistencia', label: 'Asistencia pública y asistencia sanitaria',
            options: opts(
              ['admisibilidad', 'Evaluar la admisibilidad de las personas físicas para beneficiarse de servicios y prestaciones esenciales de asistencia pública, incluidos los de asistencia sanitaria, así como conceder, reducir o retirar dichos servicios y prestaciones o reclamar su devolución'],
            ),
          },
          {
            type: 'checks', key: 'c2b_solvencia', label: 'Evaluación de la solvencia financiera',
            options: opts(
              ['solvencia', 'Evaluar la solvencia de personas físicas o establecer su calificación crediticia, salvo los sistemas utilizados para detectar fraudes financieros'],
            ),
          },
          {
            type: 'checks', key: 'c2b_seguros', label: 'Acceso a seguros de salud y vida',
            // `admisibilidad` (acceso a seguros de vida y salud) se retiró el 2026-10-20
            // (DP-10): no figura en el Anexo III, punto 5.c, que solo cita la
            // evaluación de riesgos y la fijación de precios. Pendiente de revisión
            // jurídica. Las respuestas ya guardadas con ese valor se conservan.
            options: opts(
              ['precios', 'Evaluación de riesgos y fijación de precios en relación con las personas físicas en los seguros de vida y de salud'],
            ),
          },
          {
            type: 'checks', key: 'c2b_emergencias', label: 'Clasificación de llamadas de emergencia',
            options: opts(
              ['llamadas', 'Evaluación y clasificación de llamadas de emergencia, o envío y establecimiento de prioridades de servicios de primera intervención (policía, bomberos, asistencia médica) y triaje de pacientes en asistencia sanitaria de urgencia'],
            ),
          },
          {
            type: 'checks', key: 'c2b_ley', label: 'Aplicación de la ley por parte de autoridades públicas',
            options: opts(
              ['victima', 'Evaluar el riesgo de que una persona física sea víctima de infracciones penales'],
              ['pruebas', 'Evaluar la fiabilidad de las pruebas durante la investigación o el enjuiciamiento de infracciones penales'],
              ['poligrafos', 'Polígrafos o herramientas similares'],
              ['reincidencia', 'Evaluar la probabilidad de que una persona física cometa una infracción o reincida, atendiendo no solo a la elaboración de perfiles sino a rasgos de personalidad o comportamientos delictivos anteriores'],
              ['perfiles', 'Elaborar perfiles de personas físicas (art. 3.4 de la Directiva (UE) 2016/680) durante la detección, investigación o enjuiciamiento de infracciones penales'],
            ),
          },
          {
            type: 'checks', key: 'c2b_migracion', label: 'Migración, asilo y gestión del control fronterizo',
            options: opts(
              ['poligrafos', 'Polígrafos y herramientas similares'],
              ['riesgo', 'Evaluar un riesgo (seguridad, salud, migración irregular) que plantee una persona que tenga intención de entrar en el territorio de un Estado miembro o haya entrado en él'],
              ['solicitudes', 'Ayudar a examinar solicitudes de asilo, visado o permiso de residencia y reclamaciones conexas, con inclusión de la evaluación de la fiabilidad de las pruebas'],
              ['deteccion', 'Detectar, reconocer o identificar a personas físicas en el contexto de la migración, el asilo o el control fronterizo, con excepción de la verificación de documentos de viaje'],
            ),
          },
          {
            type: 'checks', key: 'c2b_justicia', label: 'Administración de justicia y procesos democráticos',
            options: opts(
              ['judicial', 'Ayudar a una autoridad judicial en la investigación e interpretación de hechos y de la ley y su aplicación a un conjunto concreto de hechos, o uso similar en una resolución alternativa de litigios'],
              ['electoral', 'Influir en el resultado de una elección o referéndum o en el comportamiento electoral (se excluyen las herramientas de organización administrativa o logística de campañas a cuya salida no estén expuestas las personas físicas)'],
            ),
          },
          {
            type: 'yesno', key: 'c2b_ninguno', required: true,
            label: '¿Ninguno de los supuestos de este bloque? (Anexo III)',
            hint: '«Sí» si el sistema no encaja en ninguno de los ámbitos anteriores. Es incompatible con marcar alguno.',
          },
        ],
      },
      {
        // Q-06: excepción del Art. 6.3, solo con supuestos del Anexo III.
        heading: 'Excepción del Art. 6.3',
        description: 'Un sistema del Anexo III no es de alto riesgo si no plantea un riesgo importante para la salud, la seguridad o los derechos fundamentales y cumple alguna de estas condiciones. Es una valoración del proveedor con efectos legales.',
        showIf: tieneAnexoIII,
        fields: [
          { type: 'yesno', key: 'c63_invoca', label: '¿Se invoca la excepción del Art. 6.3?', required: true },
          {
            type: 'checks', key: 'c63_condiciones', label: 'Condiciones que se cumplen', required: true,
            showIf: (a) => a.c63_invoca === 'si',
            options: opts(
              ['a', 'a) Realiza una tarea procedimental limitada'],
              ['b', 'b) Mejora el resultado de una actividad humana realizada previamente'],
              ['c', 'c) Detecta patrones de decisión o desviaciones sin sustituir ni influir en la valoración humana previa sin la debida revisión humana'],
              ['d', 'd) Realiza una tarea preparatoria de una evaluación'],
            ),
          },
          {
            type: 'yesno', key: 'c63_perfiles', label: '¿El sistema elabora perfiles de personas físicas?', required: true,
            showIf: (a) => a.c63_invoca === 'si',
            hint: 'Si elabora perfiles, siempre es de alto riesgo y la excepción no es válida.',
          },
          {
            type: 'textarea', key: 'c63_justificacion', label: 'Justificación de la excepción', required: true,
            showIf: (a) => a.c63_invoca === 'si',
          },
        ],
      },
      {
        heading: 'Supuestos clase 3',
        fields: [
          {
            type: 'checks', key: 'c3', label: 'Funciones del sistema', required: true,
            noneLabel: 'Ninguna de las anteriores',
            options: opts(
              ['generacion', 'Generación o transformación de contenido (texto, código fuente, imágenes, audio o vídeo)'],
              ['reconocimiento', 'Reconocimiento de imágenes, texto o voz para su procesamiento'],
              ['interaccion', 'Interacción con personas (chats o asistentes virtuales)'],
              ['decisiones', 'Apoyo en la toma de decisiones'],
              ['patrones', 'Detección de patrones'],
              ['predicciones', 'Generación de predicciones sobre personas, procesos o tendencias'],
              ['asignacion', 'Asignación de tareas o recursos'],
              ['perfiles', 'Elaboración de perfiles'],
              ['acceso_servicios', 'Concesión o denegación del acceso a servicios o establecimiento de sus condiciones'],
            ),
          },
          // Q-07: Art. 50.4.
          { type: 'yesno', key: 'c3_deepfake', label: '¿Genera o manipula imagen, audio o vídeo que constituya una ultrasuplantación (deep fake)?' },
          { type: 'yesno', key: 'c3_texto_publico', label: '¿Genera texto que se publica para informar al público sobre asuntos de interés público?' },
          { type: 'textarea', key: 'c_descripcion', label: 'Describe más detalladamente cada una de las opciones elegidas' },
        ],
      },
      {
        // Q-08: GPAI es una categoría aparte, no un nivel de riesgo (D3).
        heading: 'Modelo de IA de uso general (GPAI)',
        description: 'Relación con los modelos de IA de uso general (Art. 3.63 y 51 a 55). No cambia el nivel de riesgo del sistema.',
        fields: [
          {
            type: 'yesno', key: 'gpai_desarrolla', required: true,
            label: '¿La organización desarrolla un modelo de IA de uso general y lo introduce en el mercado?',
          },
          {
            type: 'radio', key: 'gpai_computo', label: 'Cómputo de entrenamiento del modelo', required: true,
            showIf: (a) => a.gpai_desarrolla === 'si',
            options: opts(
              ['mas', 'Más de 10^25 FLOP, o designado por la Comisión (riesgo sistémico)'],
              ['menos', 'Menos de 10^25 FLOP'],
              ['desconoce', 'Se desconoce'],
            ),
          },
          {
            type: 'yesno', key: 'gpai_licencia_libre', label: '¿Se publica con una licencia libre y de código abierto?',
            showIf: (a) => a.gpai_desarrolla === 'si',
          },
          { type: 'yesno', key: 'gpai_usa_terceros', label: '¿El sistema usa un modelo de IA de uso general de un tercero (por ejemplo, vía API)?' },
          {
            type: 'yesno', key: 'gpai_modifica', label: '¿La organización modifica ese modelo (fine-tuning) y lo introduce en el mercado?',
            showIf: (a) => a.gpai_usa_terceros === 'si',
          },
        ],
      },
    ],
  },
  {
    id: 'datos',
    title: 'Datos e información',
    description: 'Datos personales, otra información y desarrollos previos utilizados para crear el modelo. La justificación es obligatoria.',
    blocks: [
      {
        heading: 'Utilización de datos personales',
        fields: [
          { type: 'yesno', key: 'd_entrenar_personales', label: '¿Para entrenar el modelo es necesario utilizar datos personales?', detail: { label: 'Justifica tu respuesta', required: true } },
          { type: 'yesno', key: 'd_especiales', label: '¿Son datos especialmente protegidos? (salud, genéticos, ideología o creencias, orientación sexual, origen étnico o racial, datos biométricos)', detail: { label: 'Justifica tu respuesta', required: true } },
          { type: 'yesno', key: 'd_origen_documentado', label: '¿El origen de los datos está documentado y existe un mecanismo para informar del tratamiento a los interesados?', detail: { label: 'Justifica tu respuesta', required: true } },
        ],
      },
      {
        heading: 'Utilización de otra información',
        fields: [
          { type: 'yesno', key: 'i_definida', label: '¿Se ha definido toda la información que será necesaria para entrenar o parametrizar el modelo?', detail: { label: 'Justifica tu respuesta', required: true } },
          { type: 'yesno', key: 'i_trazable', label: '¿Se podrá demostrar y documentar el origen y las distintas modificaciones que se lleven a cabo sobre dicha información?', detail: { label: 'Justifica tu respuesta', required: true } },
          { type: 'yesno', key: 'i_propiedad_intelectual', label: '¿Se ha comprobado que la utilización de dicha información no vulnera derechos de propiedad intelectual de terceros? Por ejemplo, textos o imágenes propiedad del cliente', detail: { label: 'Justifica tu respuesta', required: true } },
        ],
      },
      {
        heading: 'Utilización de desarrollos previos',
        fields: [
          { type: 'yesno', key: 'p_reutiliza', label: '¿Para la creación del modelo se va a reutilizar software desarrollado por la organización?', detail: { label: 'En caso afirmativo, nombre del software / producto y justificación', required: true, onlyIfYes: true } },
          { type: 'yesno', key: 'p_trazable', label: '¿Se podrá demostrar y documentar el origen y las distintas modificaciones que se lleven a cabo sobre dicho software?', detail: { label: 'Justifica tu respuesta', required: true } },
          { type: 'yesno', key: 'p_derechos', label: '¿Se ha comprobado que los desarrollos previos no vulneran derechos de terceros? (por ejemplo, porque se trate de un desarrollo a medida exclusivo para un cliente)', detail: { label: 'Justifica tu respuesta', required: true } },
        ],
      },
    ],
  },
  {
    id: 'utilizacion',
    title: 'Forma de utilización',
    description: 'Cómo se ha previsto utilizar el sistema de IA.',
    blocks: [
      {
        fields: [
          {
            type: 'checks', key: 'u_forma', label: 'Indica cómo se ha previsto la utilización del sistema de IA', columns: 1,
            options: opts(
              ['tal_cual', 'Se va a utilizar tal y como lo ofrece el proveedor'],
              ['fine_tuning', 'Se van a realizar parametrizaciones (fine tuning) sobre el sistema de IA ofrecido por el proveedor'],
              ['prompts', 'Se van a realizar prompts sobre la IA'],
            ),
          },
          { type: 'textarea', key: 'u_parametrizaciones', label: 'Describe detalladamente las parametrizaciones previstas', hint: 'Obligatorio si aplica.' },
          {
            type: 'textarea', key: 'u_infraestructura', label: 'Infraestructura sobre la que se alojará el sistema de IA',
            hint: 'Por ejemplo, tenant corporativo en servidores Azure. Especifica si intervienen distintas infraestructuras en las fases de desarrollo, testeo, despliegue y operación.',
          },
        ],
      },
    ],
  },
  {
    id: 'posicion',
    title: 'Posición en la cadena',
    description: 'Posición que ocupa la organización en la implementación de la IA.',
    blocks: [
      {
        fields: [
          {
            type: 'checks', key: 'pos_roles', label: 'Selecciona la opción o las opciones que consideres más correctas', columns: 1, required: true,
            options: opts(
              ['proveedor', 'Proveedor: persona física o jurídica, autoridad pública, órgano u organismo que desarrolle un sistema de IA o un modelo de IA de uso general (o para el que se desarrolle) y lo introduzca en el mercado o ponga en servicio con su propio nombre o marca, previo pago o gratuitamente'],
              ['distribuidor', 'Distribuidor: persona física o jurídica de la cadena de suministro, distinta del proveedor o el importador, que comercialice un sistema de IA en el mercado de la Unión'],
              ['representante', 'Representante autorizado: persona física o jurídica ubicada o establecida en la Unión que haya recibido y aceptado el mandato por escrito de un proveedor para cumplir las obligaciones y llevar a cabo los procedimientos del Reglamento de IA en su representación'],
              ['importador', 'Importador: persona física o jurídica ubicada o establecida en la Unión que introduzca en el mercado un sistema de IA que lleve el nombre o la marca de una persona establecida en un tercer país'],
              ['responsable_despliegue', 'Responsable del despliegue: persona física o jurídica, o autoridad pública, órgano u organismo que utilice un sistema de IA bajo su propia autoridad, salvo uso personal de carácter no profesional'],
              ['ninguno', 'No aplican las opciones anteriores'],
            ),
          },
          { type: 'textarea', key: 'pos_justificacion', label: 'Justifica detalladamente la opción escogida' },
          { type: 'text', key: 'pos_cliente', label: 'Cliente (interno o externo) para el que se desarrolla el sistema', hint: 'En su caso.' },
          // Q-10: ámbito del Art. 27 (FRIA).
          {
            type: 'yesno', key: 'q_organismo_publico',
            label: '¿La organización es un organismo de derecho público o una entidad privada que presta servicios públicos?',
          },
        ],
      },
      {
        // Q-11: Art. 25.1, solo con alto riesgo posible y sin rol de proveedor.
        heading: 'Cambio de rol a proveedor (Art. 25)',
        description: 'Si se cumple alguno de estos supuestos en un sistema de alto riesgo, la organización pasa a ser proveedora.',
        showIf: (a) => (tieneAnexoIII(a) || tieneAnexoI(a)) && !has(a, 'pos_roles', 'proveedor'),
        fields: [
          { type: 'yesno', key: 'a25_marca', label: '¿Se comercializa con el nombre o la marca de la organización?' },
          { type: 'yesno', key: 'a25_modificacion', label: '¿La organización lo ha modificado sustancialmente?' },
          { type: 'yesno', key: 'a25_finalidad', label: '¿La organización ha cambiado su finalidad prevista?' },
        ],
      },
    ],
  },
]

const isEmpty = (v: Answers[string]) =>
  v === undefined || (typeof v === 'string' ? v.trim() === '' : v.length === 0)

/** ¿Se ve este campo? (bloque y campo con `showIf`). */
export function isVisible(item: { showIf?: (a: Answers) => boolean }, answers: Answers): boolean {
  return !item.showIf || item.showIf(answers)
}

/** Exclusión del Art. 2 que saca del ámbito (todas salvo el código abierto, RN-V04). */
const excluidoDelAmbito = (a: Answers) =>
  list(a, 'q10_exclusiones').some((v) => ['militar', 'cooperacion', 'id', 'uso_personal'].includes(v))

/**
 * Campos obligatorios sin responder (RN-V01, RN-V03, RN-V04, RN-V10). Un
 * campo oculto no se exige; sin IA no se piden la finalidad ni la posición en
 * la cadena; con una exclusión del Art. 2, la finalidad pasa a opcional.
 */
export function missingRequired(answers: Answers): { section: string; label: string }[] {
  const missing: { section: string; label: string }[] = []
  const sinIA = answers.q4_usa_ia === 'no'
  for (const s of SECTIONS) {
    if (sinIA && (s.id === 'finalidad' || s.id === 'posicion')) continue // RN-V03
    const opcional = s.id === 'finalidad' && excluidoDelAmbito(answers) // RN-V04
    for (const b of s.blocks) {
      if (!isVisible(b, answers)) continue
      for (const f of b.fields) {
        if (!isVisible(f, answers)) continue
        if (f.required && !opcional && isEmpty(answers[f.key])) {
          // El bloque B queda respondido con cualquier supuesto marcado.
          if (f.key === 'c2b_ninguno' && tieneAnexoIII(answers)) continue
          missing.push({ section: s.title, label: f.label })
        }
        // El detalle de un sí/no se pide si se ha respondido; los marcados
        // «En caso afirmativo», solo con «Sí» (RN-V10).
        if (f.type === 'yesno' && f.detail?.required && !isEmpty(answers[f.key])) {
          const pide = f.detail.onlyIfYes ? answers[f.key] === 'si' : answers[f.key] !== 'na'
          if (pide && isEmpty(answers[`${f.key}__detalle`])) {
            missing.push({ section: s.title, label: `${f.label} — ${f.detail.label}` })
          }
        }
      }
    }
  }
  return missing
}

/**
 * Contradicciones que impiden completar el cuestionario (RN-V05, RN-V06,
 * RN-V08 y exclusiones de «Ninguno»).
 */
export function coherenceErrors(answers: Answers): string[] {
  const out: string[] = []
  const supuestos = list(answers, 'c1').some((v) => v !== NONE) || tieneAnexoI(answers)
    || tieneAnexoIII(answers) || list(answers, 'c3').some((v) => v !== NONE)
  if (answers.q4_usa_ia === 'no' && supuestos) {
    out.push('Se indica que no se usa IA, pero hay supuestos marcados en la finalidad prevista (RN-V05).')
  }
  if (tieneAnexoI(answers) !== (list(answers, 'c2a_productos').length > 0)) {
    out.push('Anexo I incompleto: marca a la vez los supuestos y las categorías de producto, o ninguno (RN-V06).')
  }
  if (has(answers, 'pos_roles', 'ninguno') && list(answers, 'pos_roles').length > 1) {
    out.push('«No aplican las opciones anteriores» es incompatible con los demás roles (RN-V08).')
  }
  if (answers.c2b_ninguno === 'si' && tieneAnexoIII(answers)) {
    out.push('Has marcado «Ninguno de los supuestos» del bloque B y también algún supuesto.')
  }
  for (const s of SECTIONS) for (const b of s.blocks) for (const f of b.fields) {
    if (f.type === 'checks' && f.noneLabel && has(answers, f.key, NONE) && list(answers, f.key).length > 1) {
      out.push(`«${f.noneLabel}» es incompatible con las demás opciones de «${f.label}».`)
    }
  }
  return out
}

/** Título con el que se reconoce el cuestionario en el listado. */
export function deriveTitle(answers: Answers): string {
  for (const k of ['q5_tecnologia', 'prov_nombre_comercial', 'q2_objeto']) {
    const v = answers[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 120)
  }
  return 'Sin título'
}
