## TAREA ACTUAL: Auth, Empresas y Usuarios

FLUJOS A IMPLEMENTAR:

REGISTRO: /register → Supabase Auth crea user → trigger crea 
organization + profile(role=admin) → redirect /onboarding

LOGIN: /login → Supabase Auth → JWT en cookies HttpOnly → /dashboard

INVITACIÓN: Admin crea invitation(token,email,role) → n8n envía 
email → /invite/[token] → valida token → crea/vincula profile

RECOVERY: /forgot-password → Supabase magic link → /reset-password

ONBOARDING WIZARD (5 pasos, salteable):
1. Perfil org: logo, nombre, sector, geografías
2. Plan y módulos
3. Primer sistema IA (opcional)
4. Invitar equipo (opcional)
5. Completado → /dashboard

SETTINGS:
/settings/organization → info org, logo upload, módulos, zona peligro
/settings/users → tabla usuarios, invitaciones pendientes, roles

REGLAS CRÍTICAS:
- Siempre ≥1 admin por organización
- Límites de usuarios según plan (verificar en /invite)
- Invitaciones expiran en 7 días (retornar 410 si expiradas)
- Email único por organización
- Logo en Supabase Storage: bucket 'org-logos', 
  path {org_id}/logo.{ext}, max 2MB
- Slug auto-generado del nombre, editable, único

ROLES Y PERMISOS:
admin → todo
dpo → inventory+gaps+evidences+reporting (sin billing ni user mgmt)
technical → editar sistemas IA
executive → solo lectura dashboard y reporting
auditor → solo lectura evidencias (vista específica)
viewer → solo lectura inventario básico

ENDPOINTS FASTAPI:
POST /api/v1/auth/register-organization
GET|PUT /api/v1/organizations/me
DELETE /api/v1/organizations/me (solo admin, soft delete)
GET /api/v1/users
POST /api/v1/users/invite
GET /api/v1/invitations/validate/[token]
POST /api/v1/invitations/accept/[token]
PUT /api/v1/users/[id]/role (solo admin)
DELETE /api/v1/users/[id] (solo admin)
GET|PUT /api/v1/users/me/profile

ZUSTAND authStore: { user, profile, organization, isLoading,
setUser, setProfile, setOrganization, loadUserData, signOut }

MIDDLEWARE: proteger /(app)/*, redirect según estado:
sin sesión → /login
sesión + sin onboarding → /onboarding
sesión + onboarding completo → /dashboard