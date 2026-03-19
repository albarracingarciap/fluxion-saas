Vamos a trabajar en el diseño de una plataforma SaaS llamada Fluxion

## FLUXION — CONTEXTO DE PLATAFORMA

PRODUCTO: SaaS de gobierno de IA que combina inventario 
inteligente de sistemas IA, clasificación automática bajo 
el AI Act europeo e ISO 42001, gestión de riesgos y un agente conversacional de compliance. Módulos sectoriales para Banca (DORA+EBA), Salud (MDR/IVDR) y Sector Público (ENS+Transparencia).

MODELO DE NEGOCIO: Multi-tenant B2B
- Starter 299€/mes: 10 sistemas, 3 usuarios
- Professional 899€/mes: ilimitado, 15 usuarios, ISO 42001
- Enterprise 2.500€+/mes: white label, on-premise, SLA
- Partner 1.499€/mes: multi-cliente, panel unificado
- Add-on módulos sectoriales: +300€/mes cada uno

AUDIENCIA: DPOs, CIOs, directores de riesgo en organizaciones 
con sistemas IA en sectores regulados europeos.

ARQUITECTURA MULTI-TENANT: Aislamiento mediante Row Level 
Security en PostgreSQL. Cada tenant filtra por organization_id 
del JWT. El backend usa SUPABASE_SERVICE_KEY para operaciones administrativas que bypasean RLS. De momento es Supabase en su servidor.

ARQUITECTURA MULTI-MÓDULO: Módulos sectoriales como plugins en /modules/{sector}/. Cada módulo tiene manifest.json, /rag, /taxonomy, /evaluations, /prompts, /templates. El Module Loader compone en runtime los recursos base + módulos activos del tenant.
