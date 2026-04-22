export type Iso42001Control = {
  id: string
  group: string
  title: string
  description?: string
}

export const ISO_42001_CONTROLS: Iso42001Control[] = [
  // A.2 Políticas relacionadas con la IA
  { id: 'A.2.2', group: 'A.2 Políticas relacionadas con la IA', title: 'Política de IA' },
  { id: 'A.2.3', group: 'A.2 Políticas relacionadas con la IA', title: 'Alineación con otras políticas organizacionales' },
  { id: 'A.2.4', group: 'A.2 Políticas relacionadas con la IA', title: 'Revisión de la política de IA' },

  // A.3 Organización interna
  { id: 'A.3.2', group: 'A.3 Organización interna', title: 'Roles y responsabilidades de IA' },
  { id: 'A.3.3', group: 'A.3 Organización interna', title: 'Reporte de preocupaciones' },

  // A.4 Recursos para sistemas de IA
  { id: 'A.4.2', group: 'A.4 Recursos para sistemas de IA', title: 'Documentación de recursos' },
  { id: 'A.4.3', group: 'A.4 Recursos para sistemas de IA', title: 'Recursos de datos' },
  { id: 'A.4.4', group: 'A.4 Recursos para sistemas de IA', title: 'Recursos de herramientas' },
  { id: 'A.4.5', group: 'A.4 Recursos para sistemas de IA', title: 'Recursos del sistema y computación' },
  { id: 'A.4.6', group: 'A.4 Recursos para sistemas de IA', title: 'Recursos humanos' },

  // A.5 Evaluación de impactos de los sistemas de IA
  { id: 'A.5.2', group: 'A.5 Evaluación de impactos de los sistemas de IA', title: 'Proceso de evaluación del impacto del sistema de IA' },
  { id: 'A.5.3', group: 'A.5 Evaluación de impactos de los sistemas de IA', title: 'Documentación de evaluaciones del impacto del sistema de IA' },
  { id: 'A.5.4', group: 'A.5 Evaluación de impactos de los sistemas de IA', title: 'Evaluación del impacto en individuos o grupos de individuos' },
  { id: 'A.5.5', group: 'A.5 Evaluación de impactos de los sistemas de IA', title: 'Evaluación de los impactos sociales de los sistemas de IA' },

  // A.6 Ciclo de vida del sistema de IA
  { id: 'A.6.1.2', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Objetivos para el desarrollo responsable del sistema de IA' },
  { id: 'A.6.1.3', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Procesos para el diseño y desarrollo responsable del sistema de IA' },
  { id: 'A.6.2.2', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Requisitos y especificaciones del sistema de IA' },
  { id: 'A.6.2.3', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Documentación del diseño y desarrollo del sistema de IA' },
  { id: 'A.6.2.4', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Verificación y validación del sistema de IA' },
  { id: 'A.6.2.5', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Implementación del sistema de IA' },
  { id: 'A.6.2.6', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Operación y monitoreo del sistema de IA' },
  { id: 'A.6.2.7', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Documentación técnica del sistema de IA' },
  { id: 'A.6.2.8', group: 'A.6 Ciclo de vida del sistema de IA', title: 'Registro de eventos del sistema de IA' },

  // A.7 Datos para sistemas de IA
  { id: 'A.7.2', group: 'A.7 Datos para sistemas de IA', title: 'Datos para el desarrollo y mejora del sistema de IA' },
  { id: 'A.7.3', group: 'A.7 Datos para sistemas de IA', title: 'Adquisición de datos' },
  { id: 'A.7.4', group: 'A.7 Datos para sistemas de IA', title: 'Calidad de los datos para sistemas de IA' },
  { id: 'A.7.5', group: 'A.7 Datos para sistemas de IA', title: 'Procedencia de los datos' },
  { id: 'A.7.6', group: 'A.7 Datos para sistemas de IA', title: 'Preparación de datos' },

  // A.8 Información para las partes interesadas de los sistemas de IA
  { id: 'A.8.2', group: 'A.8 Información para las partes interesadas de los sistemas de IA', title: 'Documentación del sistema e información para los usuarios' },
  { id: 'A.8.3', group: 'A.8 Información para las partes interesadas de los sistemas de IA', title: 'Informe externo' },
  { id: 'A.8.4', group: 'A.8 Información para las partes interesadas de los sistemas de IA', title: 'Comunicación de incidentes' },
  { id: 'A.8.5', group: 'A.8 Información para las partes interesadas de los sistemas de IA', title: 'Información para las partes interesadas' },

  // A.9 Uso de sistemas de IA
  { id: 'A.9.2', group: 'A.9 Uso de sistemas de IA', title: 'Procesos para el uso responsable de sistemas de IA' },
  { id: 'A.9.3', group: 'A.9 Uso de sistemas de IA', title: 'Objetivos para el uso responsable de sistemas de IA' },
  { id: 'A.9.4', group: 'A.9 Uso de sistemas de IA', title: 'Uso previsto del sistema de IA' },

  // A.10 Relaciones con terceros y clientes
  { id: 'A.10.2', group: 'A.10 Relaciones con terceros y clientes', title: 'Asignación de responsabilidades' },
  { id: 'A.10.3', group: 'A.10 Relaciones con terceros y clientes', title: 'Proveedores' },
  { id: 'A.10.4', group: 'A.10 Relaciones con terceros y clientes', title: 'Clientes' }
]
