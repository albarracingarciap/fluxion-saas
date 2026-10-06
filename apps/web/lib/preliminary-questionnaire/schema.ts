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
//   checks                    -> string[] con los `value` marcados

export type Option = { value: string; label: string }

type Base = { key: string; label: string; hint?: string; required?: boolean }

export type Field =
  | (Base & { type: 'text' | 'textarea' | 'date'; placeholder?: string })
  | (Base & { type: 'radio'; options: Option[] })
  | (Base & {
      type: 'yesno'
      naLabel?: string
      detail?: { label: string; required?: boolean; placeholder?: string }
    })
  | (Base & { type: 'checks'; options: Option[]; columns?: 1 | 2 })

export type Block = { heading?: string; description?: string; fields: Field[] }

export type Section = {
  id: string
  title: string
  description: string
  blocks: Block[]
}

export type Answers = Record<string, string | string[] | undefined>

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
            detail: { label: 'Datos personales objeto del tratamiento', required: true },
          },
          { type: 'yesno', key: 'q4_usa_ia', label: '4. ¿Se va a utilizar tecnología IA en el proyecto / oportunidad?', required: true },
          {
            type: 'radio', key: 'q4_propiedad', label: 'En caso afirmativo, ¿de quién es el sistema de IA?',
            options: opts(
              ['tercero_cliente', 'Propiedad de un tercero (Microsoft, Google…) y adquirido directamente por el cliente'],
              ['tercero_organizacion', 'Propiedad de un tercero (Microsoft, Google…) y adquirido por la organización'],
              ['propio_organizacion', 'Desarrollo propio, con la propiedad intelectual de la organización'],
              ['propio_cliente', 'Desarrollo propio para un cliente, cuya propiedad intelectual pertenecerá al cliente'],
            ),
          },
          { type: 'text', key: 'q5_tecnologia', label: '5. ¿Qué tecnología se va a utilizar?', hint: 'Nombre de la IA.' },
          {
            type: 'yesno', key: 'q6_autoriza', label: '6. ¿El cliente ha autorizado el uso de IA?', naLabel: 'No aplica',
            detail: { label: 'Nombre del cliente' },
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
              ['profesional', 'El sistema de IA se utiliza para actividades exclusivamente profesionales'],
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
            type: 'checks', key: 'c1', label: 'Prácticas',
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
        ],
      },
      {
        heading: 'Supuestos clase 2 · Bloque A',
        description: 'Componente de seguridad de un producto o producto sujeto a legislación de armonización.',
        fields: [
          {
            type: 'checks', key: 'c2a', label: 'Supuestos',
            options: opts(
              ['componente_seguridad', 'El sistema de IA está destinado a ser utilizado como componente de seguridad de un producto (componente que cumple una función de seguridad o cuyo fallo pone en peligro la salud y seguridad de las personas o los bienes)'],
              ['evaluacion_terceros', 'El producto del que el sistema es componente de seguridad, o el propio sistema como producto, debe someterse a una evaluación de la conformidad de terceros para su introducción en el mercado o puesta en servicio'],
            ),
          },
          {
            type: 'checks', key: 'c2a_productos', columns: 2,
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
            ),
          },
        ],
      },
      {
        heading: 'Supuestos clase 2 · Bloque B',
        description: 'Ámbitos de alto riesgo.',
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
              ['componente_seguridad', 'Componentes de seguridad en la gestión y funcionamiento de las infraestructuras digitales críticas del tráfico rodado, ferroviario y aéreo, salvo que estén regulados en la legislación de armonización o en la normativa sectorial'],
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
            options: opts(
              ['admisibilidad', 'Toma de decisiones, o influencia sustancial en ellas, sobre la admisibilidad de las personas físicas para acceder a seguros de salud y de vida'],
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
        ],
      },
      {
        heading: 'Supuestos clase 3',
        fields: [
          {
            type: 'checks', key: 'c3', label: 'Funciones del sistema',
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
          { type: 'textarea', key: 'c_descripcion', label: 'Describe más detalladamente cada una de las opciones elegidas' },
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
          { type: 'yesno', key: 'p_reutiliza', label: '¿Para la creación del modelo se va a reutilizar software desarrollado por la organización?', detail: { label: 'En caso afirmativo, nombre del software / producto y justificación', required: true } },
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
            type: 'checks', key: 'pos_roles', label: 'Selecciona la opción o las opciones que consideres más correctas', columns: 1,
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
        ],
      },
    ],
  },
]

const isEmpty = (v: Answers[string]) =>
  v === undefined || (typeof v === 'string' ? v.trim() === '' : v.length === 0)

/** Campos obligatorios sin responder, para poder marcar el cuestionario como completado. */
export function missingRequired(answers: Answers): { section: string; label: string }[] {
  const missing: { section: string; label: string }[] = []
  for (const s of SECTIONS) {
    for (const b of s.blocks) {
      for (const f of b.fields) {
        if (f.required && isEmpty(answers[f.key])) {
          missing.push({ section: s.title, label: f.label })
        }
        // La justificación solo se exige si la pregunta se ha respondido.
        if (f.type === 'yesno' && f.detail?.required && !isEmpty(answers[f.key])) {
          if (answers[f.key] !== 'na' && isEmpty(answers[`${f.key}__detalle`])) {
            missing.push({ section: s.title, label: `${f.label} — ${f.detail.label}` })
          }
        }
      }
    }
  }
  return missing
}

/** Título con el que se reconoce el cuestionario en el listado. */
export function deriveTitle(answers: Answers): string {
  for (const k of ['q5_tecnologia', 'prov_nombre_comercial', 'q2_objeto']) {
    const v = answers[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 120)
  }
  return 'Sin título'
}
