---
id: FUN-LOGIN
titulo: Inicio de sesión
tipo: funcional
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(auth)/actions.ts
  - apps/web/app/(auth)/layout.tsx
  - apps/web/lib/supabase/middleware.ts
  - apps/web/app/page.tsx
---

# Inicio de sesión

Pantalla de acceso a Fluxion con correo electrónico y contraseña.

## Propósito

Autenticar a un usuario y llevarlo a su organización: al **Dashboard** si ya completó la configuración
inicial, o al **Onboarding** si no.

## Acceso y permisos

- **Ruta:** `/login`
- **Navegación:** es el destino de `/` cuando no hay sesión, de cualquier ruta protegida sin sesión, del
  enlace **Iniciar sesión** de [Registro](registro.md) y de **Cerrar sesión** en la barra superior.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Sin sesión | Sí | Iniciar sesión, ir a Registro |
| Con sesión | No: el middleware redirige a `/dashboard` o a `/onboarding` según `profiles.onboarding_completed` | — |

La pantalla usa el layout de autenticación: contenido centrado, sin menú lateral ni barra superior.

## Campos

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Email Corporativo** | email | Sí | Placeholder «tu@empresa.com» | `auth.users.email` |
| **Contraseña** | password | Sí | Placeholder «••••••••» | Supabase Auth |

Encima del formulario se muestran, si llegan en la URL:
- un aviso de error (`?error=`);
- un mensaje informativo (`?message=`), por ejemplo «Revisa tu email para confirmar la cuenta» tras el
  registro.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Iniciar sesión** | Cualquiera | Server action `login`: `supabase.auth.signInWithPassword` | Si es correcto, redirige a `/dashboard` u `/onboarding`. Si falla, vuelve a `/login?error=Credenciales incorrectas`. No escribe en la base de datos ni en el registro de auditoría |
| **¿Olvidaste la contraseña?** | — | No hace nada (`href="#"`) | — |
| **¿No tienes cuenta? Regístrate en Fluxion** | Cualquiera | Navega a `/register` | — |

> **Pendiente de implementar.** Recuperación de contraseña. No existe ninguna ruta de restablecimiento.

## Validaciones

- **Cliente:** campos obligatorios y formato de correo (validación nativa del navegador).
- **Servidor:** cualquier fallo de autenticación muestra el mismo mensaje, «Credenciales incorrectas».
  Ocurre también si el correo no está confirmado o el usuario no existe.

> **Pendiente de implementar.** Verificación en dos pasos en el inicio de sesión. Aunque el usuario la
> tenga activada en su [Perfil](perfil.md), el login solo pide la contraseña. Tampoco se aplican los
> ajustes de seguridad de la organización (MFA obligatorio, dominios permitidos, caducidad de sesión) ni
> se bloquea a los miembros desactivados.

## Estados

No aplica.

## Vistas relacionadas

- [Registro](registro.md): alta de cuenta y organización.
- [Onboarding](onboarding.md): destino si la configuración inicial no está completa.
- [Dashboard](dashboard.md): destino tras iniciar sesión.
- Negocio: [Plataforma](../negocio/plataforma.md).
