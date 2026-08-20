// Host de Supabase para `next/image`. Se DERIVA de la variable en lugar de
// escribirse a mano: la lista fija se quedo apuntando a la instancia vieja al
// estrenar el stack propio, y el logo del sidebar dejo de cargar sin ningun
// error visible — next/image rechaza el host y no pide la imagen.
//
// Se conservan ademas los dominios historicos: `logo_url` y `avatar_url` se
// guardan como URL absolutas, asi que las filas escritas contra una instancia
// anterior siguen apuntando a su host.
const HOSTS_HISTORICOS = ['supabase.fluxion-ai.es', 'supabase2.fluxion-ai.es']

const hostActual = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname || null
  } catch {
    return null
  }
})()

const hostsImagenes = [...new Set([hostActual, ...HOSTS_HISTORICOS].filter(Boolean))]

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: hostsImagenes.map((hostname) => ({
      protocol: 'https',
      hostname,
      pathname: '/storage/v1/object/public/**',
    })),
  },
  experimental: {
    // Los adjuntos de tarea admiten hasta 25 MB (MAX_SIZE_BYTES en
    // app/(app)/tareas/actions.ts). Sin esto, Next corta el cuerpo de las
    // Server Actions en 1 MB y la subida falla antes de llegar al handler.
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
};

export default nextConfig;
