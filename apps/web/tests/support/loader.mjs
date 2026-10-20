// Hook de resolución para ejecutar los tests con el TypeScript nativo de Node.
//
// Next resuelve el alias `@/` (tsconfig `paths`) y las importaciones sin
// extensión; Node no. Este hook hace lo mismo solo durante los tests, sin
// cambiar el código de la aplicación.
const RAIZ = new URL('../../', import.meta.url)
const EXTENSIONES = ['.ts', '.tsx', '/index.ts']

export async function resolve(specifier, context, nextResolve) {
  const conAlias = specifier.startsWith('@/') ? new URL(specifier.slice(2), RAIZ).href : specifier
  try {
    return await nextResolve(conAlias, context)
  } catch (error) {
    const relativo = conAlias.startsWith('.') || conAlias.startsWith('file:')
    if (!relativo) throw error
    for (const extension of EXTENSIONES) {
      try {
        return await nextResolve(conAlias + extension, context)
      } catch {
        // se prueba la siguiente
      }
    }
    throw error
  }
}
