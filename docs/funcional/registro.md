---
id: FUN-REGISTRO
titulo: Registro
tipo: funcional
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(auth)/register/page.tsx
  - apps/web/app/(auth)/actions.ts
  - supabase/migrations/20260829090000_onboarding_nombre_y_modulos.sql
  - supabase/migrations/00000000000003_auth_storage.sql
---

# Registro

Alta de una cuenta de usuario y, salvo que exista una invitación, de una nueva
[organización](../glosario.md#organización) de la que el usuario pasa a ser administrador.

## Propósito

Crear la cuenta corporativa con la que una organización empieza a usar Fluxion. Es también la vía por
la que una persona invitada crea su usuario.

## Acceso y permisos

- **Ruta:** `/register`
- **Navegación:** enlace **¿No tienes cuenta? Regístrate en Fluxion** en [Inicio de sesión](login.md).
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Sin sesión | Sí | Crear cuenta |
| Con sesión | No: el middleware redirige a `/dashboard` o a `/onboarding` | — |

## Campos

Todos los campos son obligatorios.

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Nombre** | texto | Sí | — | Metadatos del usuario → `profiles.first_name` |
| **Apellidos** | texto | Sí | — | Metadatos → `profiles.last_name` |
| **Nombre de tu Empresa / Institución** | texto | Sí | Placeholder «Ej: Banco Iberia» | Metadatos → `organizations.name` |
| **Email Corporativo** | email | Sí | Placeholder «tu@empresa.com» | `auth.users.email`, `profiles.email` |
| **Contraseña segura** | password | Sí | Mínimo 8 caracteres. No se pide confirmación | Supabase Auth |

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Crear cuenta de empresa** | Cualquiera | Server action `signup`: `supabase.auth.signUp` con nombre, apellidos y nombre de la organización como metadatos | Ver «Qué se crea». Si Supabase exige confirmar el correo, redirige a `/login` con el mensaje «Revisa tu email para confirmar la cuenta». Si se crea la sesión, redirige a `/onboarding` |
| **¿Ya tienes cuenta? Iniciar sesión** | Cualquiera | Navega a `/login` | — |

### Qué se crea

El trigger `fluxion.handle_new_user`, sobre la inserción en `auth.users`, decide:

| Caso | Resultado |
|---|---|
| Hay una invitación pendiente para ese correo (`invitations.status = 'pending'`, la más reciente) | Se crea el perfil en la organización de la invitación con su rol, y la invitación pasa a `accepted`. **El nombre de empresa del formulario se ignora** |
| No hay invitación | Se crea la organización con el nombre indicado (o «Mi Organización») y un `slug` aleatorio, y el perfil con rol `org_admin` |

Al crearse una organización:
- arranca con plan `starter`, país «Espana» y apetito al riesgo «moderado»;
- el trigger `grant_trial_modules` le concede 30 días de prueba de los módulos Conector MLflow, Detección
  de IA no declarada, Coste y uso de IA, Documentación del sistema y Supervisión humana.

En ambos casos el perfil nace con `onboarding_completed = false`, así que el usuario pasa por el
[Onboarding](onboarding.md).

## Validaciones

- **Cliente:** campos obligatorios, formato de correo y contraseña de al menos 8 caracteres.
- **Servidor:** cualquier error de Supabase muestra el mensaje genérico «Error al crear la cuenta».

> TODO: confirmar si una persona invitada debe ver el campo **Nombre de tu Empresa / Institución**, que en
> su caso se descarta.

## Estados

No aplica a la vista. La invitación asociada pasa de `pending` a `accepted` (ver [Usuarios](usuarios.md)).

## Vistas relacionadas

- [Inicio de sesión](login.md).
- [Onboarding](onboarding.md): siguiente paso tras el registro.
- [Usuarios](usuarios.md): invitaciones.
- Negocio: [Plataforma](../negocio/plataforma.md), [Módulos y planes](../negocio/modulos-y-planes.md).
