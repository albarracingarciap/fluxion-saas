/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        // Supabase self-hosted. El dominio de Supabase Cloud
        // (viptqjqrclkdpmnrxrba.supabase.co) quedó obsoleto en el cutover.
        protocol: 'https',
        hostname: 'supabase.fluxion-ai.es',
        pathname: '/storage/v1/object/public/**',
      },
    ],
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
