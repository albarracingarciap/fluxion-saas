export type Iso42001Control = {
  id: string
  group: string
  title: string
  description: string
}

export const ISO_42001_CONTROLS: Iso42001Control[] = [
  // A.2 Políticas relacionadas con la IA
  {
    id: 'A.2.2',
    group: 'A.2 Políticas relacionadas con la IA',
    title: 'Política de IA',
    description: 'La organización debe establecer, implementar, mantener y mejorar continuamente una política de IA adecuada a su propósito, que incluya el compromiso de cumplir los requisitos aplicables y de mejorar continuamente el SGIA.',
  },
  {
    id: 'A.2.3',
    group: 'A.2 Políticas relacionadas con la IA',
    title: 'Alineación con otras políticas organizacionales',
    description: 'La política de IA debe estar alineada y ser coherente con otras políticas organizacionales relevantes, como las de ética, privacidad, seguridad de la información y gestión de riesgos.',
  },
  {
    id: 'A.2.4',
    group: 'A.2 Políticas relacionadas con la IA',
    title: 'Revisión de la política de IA',
    description: 'La política de IA debe revisarse a intervalos planificados para asegurar que permanece adecuada, suficiente y eficaz a medida que el contexto organizacional y tecnológico evoluciona.',
  },

  // A.3 Organización interna
  {
    id: 'A.3.2',
    group: 'A.3 Organización interna',
    title: 'Roles y responsabilidades de IA',
    description: 'La organización debe asignar y documentar roles y responsabilidades claros para el desarrollo, despliegue y supervisión de los sistemas de IA, incluyendo la designación de un responsable de IA a nivel ejecutivo.',
  },
  {
    id: 'A.3.3',
    group: 'A.3 Organización interna',
    title: 'Reporte de preocupaciones',
    description: 'La organización debe establecer canales seguros y accesibles para que el personal pueda reportar preocupaciones sobre el comportamiento o impacto de los sistemas de IA sin temor a represalias.',
  },

  // A.4 Recursos para sistemas de IA
  {
    id: 'A.4.2',
    group: 'A.4 Recursos para sistemas de IA',
    title: 'Documentación de recursos',
    description: 'La organización debe identificar y documentar los recursos necesarios para el ciclo de vida de los sistemas de IA, incluyendo datos, herramientas, infraestructura tecnológica y competencias del personal.',
  },
  {
    id: 'A.4.3',
    group: 'A.4 Recursos para sistemas de IA',
    title: 'Recursos de datos',
    description: 'La organización debe gestionar los recursos de datos utilizados por los sistemas de IA, documentando su origen, características de calidad, formato y restricciones de uso aplicables.',
  },
  {
    id: 'A.4.4',
    group: 'A.4 Recursos para sistemas de IA',
    title: 'Recursos de herramientas',
    description: 'La organización debe identificar, evaluar y gestionar las herramientas de software y hardware empleadas en el desarrollo, validación y operación de los sistemas de IA, asegurando su idoneidad y trazabilidad.',
  },
  {
    id: 'A.4.5',
    group: 'A.4 Recursos para sistemas de IA',
    title: 'Recursos del sistema y computación',
    description: 'La organización debe planificar y documentar los recursos de computación e infraestructura requeridos para los sistemas de IA, considerando capacidad, rendimiento, disponibilidad y seguridad.',
  },
  {
    id: 'A.4.6',
    group: 'A.4 Recursos para sistemas de IA',
    title: 'Recursos humanos',
    description: 'La organización debe garantizar que el personal involucrado en el ciclo de vida de los sistemas de IA posee las competencias necesarias, y debe documentar dichas competencias así como las acciones de formación realizadas.',
  },

  // A.5 Evaluación de impactos de los sistemas de IA
  {
    id: 'A.5.2',
    group: 'A.5 Evaluación de impactos de los sistemas de IA',
    title: 'Proceso de evaluación del impacto del sistema de IA',
    description: 'La organización debe establecer, documentar e implementar un proceso sistemático para evaluar el impacto de los sistemas de IA antes de su despliegue y de forma periódica durante su operación.',
  },
  {
    id: 'A.5.3',
    group: 'A.5 Evaluación de impactos de los sistemas de IA',
    title: 'Documentación de evaluaciones del impacto del sistema de IA',
    description: 'La organización debe documentar y conservar los resultados de las evaluaciones de impacto, incluyendo los hallazgos, conclusiones, decisiones adoptadas y medidas de tratamiento aplicadas.',
  },
  {
    id: 'A.5.4',
    group: 'A.5 Evaluación de impactos de los sistemas de IA',
    title: 'Evaluación del impacto en individuos o grupos de individuos',
    description: 'La organización debe evaluar el impacto de los sistemas de IA en personas o grupos específicos, considerando aspectos de privacidad, derechos fundamentales, equidad y no discriminación.',
  },
  {
    id: 'A.5.5',
    group: 'A.5 Evaluación de impactos de los sistemas de IA',
    title: 'Evaluación de los impactos sociales de los sistemas de IA',
    description: 'La organización debe evaluar los posibles impactos sociales más amplios derivados del uso de sus sistemas de IA, incluyendo efectos sobre grupos vulnerables, el medioambiente y la cohesión social.',
  },

  // A.6 Ciclo de vida del sistema de IA
  {
    id: 'A.6.1.2',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Objetivos para el desarrollo responsable del sistema de IA',
    description: 'La organización debe establecer objetivos medibles para el desarrollo responsable de sistemas de IA, alineados con la política de IA, los principios éticos adoptados y los requisitos legales aplicables.',
  },
  {
    id: 'A.6.1.3',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Procesos para el diseño y desarrollo responsable del sistema de IA',
    description: 'La organización debe definir e implementar procesos y controles que garanticen que el diseño y desarrollo de sistemas de IA incorpora consideraciones de responsabilidad, ética y gestión de riesgos desde el inicio.',
  },
  {
    id: 'A.6.2.2',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Requisitos y especificaciones del sistema de IA',
    description: 'La organización debe definir, documentar y gestionar los requisitos funcionales y no funcionales de los sistemas de IA, incluyendo requisitos de rendimiento, seguridad, equidad y trazabilidad.',
  },
  {
    id: 'A.6.2.3',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Documentación del diseño y desarrollo del sistema de IA',
    description: 'La organización debe mantener documentación técnica actualizada de las decisiones de diseño y desarrollo de cada sistema de IA, que permita la comprensión, auditoría y reproducibilidad del sistema.',
  },
  {
    id: 'A.6.2.4',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Verificación y validación del sistema de IA',
    description: 'La organización debe ejecutar procesos de verificación y validación que confirmen que los sistemas de IA cumplen los requisitos especificados y se comportan de forma segura y conforme a su uso previsto.',
  },
  {
    id: 'A.6.2.5',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Implementación del sistema de IA',
    description: 'La organización debe gestionar el proceso de despliegue de los sistemas de IA de forma controlada, documentada y reversible, incluyendo pruebas previas en entornos de preproducción.',
  },
  {
    id: 'A.6.2.6',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Operación y monitoreo del sistema de IA',
    description: 'La organización debe monitorear continuamente el rendimiento y comportamiento de los sistemas de IA en producción, detectando desviaciones, degradaciones y comportamientos inesperados.',
  },
  {
    id: 'A.6.2.7',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Documentación técnica del sistema de IA',
    description: 'La organización debe elaborar y mantener actualizada la documentación técnica completa de cada sistema de IA, suficiente para que terceros puedan comprender su funcionamiento y evaluar su conformidad.',
  },
  {
    id: 'A.6.2.8',
    group: 'A.6 Ciclo de vida del sistema de IA',
    title: 'Registro de eventos del sistema de IA',
    description: 'La organización debe implementar mecanismos de registro y trazabilidad de los eventos significativos de los sistemas de IA, que permitan la auditoría, investigación de incidentes y rendición de cuentas.',
  },

  // A.7 Datos para sistemas de IA
  {
    id: 'A.7.2',
    group: 'A.7 Datos para sistemas de IA',
    title: 'Datos para el desarrollo y mejora del sistema de IA',
    description: 'La organización debe gestionar los datos utilizados para el desarrollo, entrenamiento y mejora continua de los sistemas de IA, asegurando su adecuación, representatividad y conformidad legal.',
  },
  {
    id: 'A.7.3',
    group: 'A.7 Datos para sistemas de IA',
    title: 'Adquisición de datos',
    description: 'La organización debe establecer procesos para la adquisición de datos que incluyan la evaluación de fuentes, verificación de permisos de uso, cumplimiento normativo y gestión contractual con proveedores de datos.',
  },
  {
    id: 'A.7.4',
    group: 'A.7 Datos para sistemas de IA',
    title: 'Calidad de los datos para sistemas de IA',
    description: 'La organización debe evaluar y asegurar la calidad de los datos utilizados en los sistemas de IA, considerando exactitud, completitud, representatividad, actualidad y ausencia de sesgos injustificados.',
  },
  {
    id: 'A.7.5',
    group: 'A.7 Datos para sistemas de IA',
    title: 'Procedencia de los datos',
    description: 'La organización debe documentar la procedencia de los datos utilizados en los sistemas de IA, incluyendo su origen, transformaciones aplicadas y la cadena de custodia, para garantizar la trazabilidad.',
  },
  {
    id: 'A.7.6',
    group: 'A.7 Datos para sistemas de IA',
    title: 'Preparación de datos',
    description: 'La organización debe implementar controles documentados para la preparación y preprocesamiento de los datos, garantizando la coherencia, reproducibilidad y trazabilidad de las transformaciones aplicadas.',
  },

  // A.8 Información para las partes interesadas de los sistemas de IA
  {
    id: 'A.8.2',
    group: 'A.8 Información para las partes interesadas de los sistemas de IA',
    title: 'Documentación del sistema e información para los usuarios',
    description: 'La organización debe proporcionar documentación clara y accesible sobre los sistemas de IA a sus usuarios y operadores, incluyendo capacidades, limitaciones, condiciones de uso seguro e instrucciones operativas.',
  },
  {
    id: 'A.8.3',
    group: 'A.8 Información para las partes interesadas de los sistemas de IA',
    title: 'Informe externo',
    description: 'La organización debe elaborar y publicar informes externos sobre sus sistemas de IA y prácticas de gobernanza en la medida requerida por la normativa aplicable o las expectativas de sus partes interesadas.',
  },
  {
    id: 'A.8.4',
    group: 'A.8 Información para las partes interesadas de los sistemas de IA',
    title: 'Comunicación de incidentes',
    description: 'La organización debe establecer procesos para notificar de forma oportuna y transparente los incidentes significativos relacionados con los sistemas de IA a las partes interesadas y autoridades competentes.',
  },
  {
    id: 'A.8.5',
    group: 'A.8 Información para las partes interesadas de los sistemas de IA',
    title: 'Información para las partes interesadas',
    description: 'La organización debe identificar las necesidades de información de sus partes interesadas y asegurar que reciben información relevante, comprensible y oportuna sobre los sistemas de IA que les afectan.',
  },

  // A.9 Uso de sistemas de IA
  {
    id: 'A.9.2',
    group: 'A.9 Uso de sistemas de IA',
    title: 'Procesos para el uso responsable de sistemas de IA',
    description: 'La organización debe establecer e implementar procesos que garanticen que el uso de los sistemas de IA por parte de los usuarios se realiza de forma responsable, conforme al uso previsto y dentro de los límites definidos.',
  },
  {
    id: 'A.9.3',
    group: 'A.9 Uso de sistemas de IA',
    title: 'Objetivos para el uso responsable de sistemas de IA',
    description: 'La organización debe definir objetivos medibles para el uso responsable de los sistemas de IA, alineados con la política de IA y revisables periódicamente.',
  },
  {
    id: 'A.9.4',
    group: 'A.9 Uso de sistemas de IA',
    title: 'Uso previsto del sistema de IA',
    description: 'La organización debe definir y documentar el uso previsto de cada sistema de IA, incluyendo el contexto de aplicación, los usuarios destinatarios, las condiciones operativas esperadas y los usos prohibidos.',
  },

  // A.10 Relaciones con terceros y clientes
  {
    id: 'A.10.2',
    group: 'A.10 Relaciones con terceros y clientes',
    title: 'Asignación de responsabilidades',
    description: 'La organización debe definir, documentar y comunicar claramente las responsabilidades de todas las partes involucradas en el ciclo de vida de los sistemas de IA, incluyendo proveedores, socios y clientes.',
  },
  {
    id: 'A.10.3',
    group: 'A.10 Relaciones con terceros y clientes',
    title: 'Proveedores',
    description: 'La organización debe gestionar las relaciones con los proveedores de componentes, modelos, datos o servicios de IA, garantizando que cumplen con los requisitos del SGIA y que los riesgos asociados son evaluados y controlados.',
  },
  {
    id: 'A.10.4',
    group: 'A.10 Relaciones con terceros y clientes',
    title: 'Clientes',
    description: 'La organización debe gestionar las relaciones con los clientes y usuarios finales de los sistemas de IA, incluyendo la comunicación de capacidades, limitaciones, condiciones de uso y mecanismos de reclamación.',
  },
]
