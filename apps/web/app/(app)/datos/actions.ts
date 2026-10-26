'use server';

import { isPlatformAdmin, requireSession } from '@/lib/auth/platform';

/**
 * ¿Puede el usuario modificar los catálogos de Datos? Solo la administración de
 * la plataforma (`lib/auth/platform.ts`). Las pantallas lo usan para mostrar u
 * ocultar los botones; las acciones lo comprueban de nuevo en el servidor.
 */
export async function canEditCatalogs(): Promise<boolean> {
  try {
    const user = await requireSession();
    return await isPlatformAdmin(user.id);
  } catch {
    return false;
  }
}
