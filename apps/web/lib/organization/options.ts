export const EU_COUNTRIES = [
  'Alemania',
  'Austria',
  'Belgica',
  'Bulgaria',
  'Chipre',
  'Croacia',
  'Dinamarca',
  'Eslovaquia',
  'Eslovenia',
  'Espana',
  'Estonia',
  'Finlandia',
  'Francia',
  'Grecia',
  'Hungria',
  'Irlanda',
  'Italia',
  'Letonia',
  'Lituania',
  'Luxemburgo',
  'Malta',
  'Paises Bajos',
  'Polonia',
  'Portugal',
  'Republica Checa',
  'Rumania',
  'Suecia',
] as const

export const NORMATIVE_MODULES = [
  'AI Act',
  'ISO 42001',
  'DORA',
  'RGPD',
  'ENS',
  'MDR/IVDR',
] as const

export const RISK_APPETITE_OPTIONS = ['conservador', 'moderado', 'amplio'] as const

export const ORGANIZATION_SECTORS = [
  'Agricultura y Agroindustria',
  'Automocion',
  'Ciencia y Tecnologia',
  'Construccion y Bienes Raices',
  'Educacion y e-Learning',
  'Energia y Recursos Naturales',
  'Banca y Finanzas',
  'Sector Publico',
  'Legal y Cumplimiento Normativo',
  'Manufactura e Industria',
  'Marketing y Publicidad',
  'Medios y Entretenimiento',
  'Recursos Humanos',
  'Retail y e-Commerce',
  'Salud',
  'Seguridad y Vigilancia',
  'Seguros',
  'Telecomunicaciones',
  'Transporte y Logistica',
  'Turismo',
  'Otro',
] as const

export const REPORT_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
] as const

export const FISCAL_MONTHS = [
  { value: 1,  label: 'Enero' },
  { value: 2,  label: 'Febrero' },
  { value: 3,  label: 'Marzo' },
  { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Mayo' },
  { value: 6,  label: 'Junio' },
  { value: 7,  label: 'Julio' },
  { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const

export type NormativeModule = (typeof NORMATIVE_MODULES)[number]
export type RiskAppetite = (typeof RISK_APPETITE_OPTIONS)[number]
export type ReportLanguage = (typeof REPORT_LANGUAGES)[number]['value']

export const SECTOR_MODULE_PRESETS: Record<string, NormativeModule[]> = {
  'Banca y Finanzas': ['AI Act', 'ISO 42001', 'DORA', 'RGPD'],
  Salud: ['AI Act', 'ISO 42001', 'RGPD', 'MDR/IVDR'],
  'Sector Publico': ['AI Act', 'ISO 42001', 'RGPD', 'ENS'],
  Otro: ['AI Act', 'ISO 42001', 'RGPD'],
}
