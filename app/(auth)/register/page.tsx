import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { signup } from "../actions"

export const metadata: Metadata = {
  title: "Registro | Fluxion",
  description: "Crea tu cuenta corporativa de gobierno de IA en Fluxion.",
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex flex-col space-y-6 w-full max-w-[420px] bg-ltcard border border-ltb p-8 rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06]">
      <div className="flex flex-col space-y-2 text-center items-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ltt font-fraunces">
          Crear cuenta corporativa
        </h1>
        <p className="text-[13.5px] text-ltt2 font-sora">
          Empieza a auditar tus sistemas IA en minutos.
        </p>
      </div>

      {searchParams?.error && (
        <div className="bg-[#fdf0ef] border border-[#f0b4b0] text-[#d93025] px-4 py-3 rounded-lg flex items-center font-sora text-[13px] animate-fadein">
          ⚠️ {searchParams.error}
        </div>
      )}
      
      <form action={signup} className="flex flex-col space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="first_name" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Nombre</label>
            <input 
              id="first_name" name="first_name" type="text" required
              className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="last_name" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Apellidos</label>
            <input 
              id="last_name" name="last_name" type="text" required
              className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5 pt-1">
          <label htmlFor="organization_name" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Nombre de tu Empresa / Institución</label>
          <input 
            id="organization_name" name="organization_name" type="text" required placeholder="Ej: Banco Iberia"
            className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all placeholder:text-lttm shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
          />
        </div>

        <div className="flex flex-col space-y-1.5 pt-1">
          <label htmlFor="email" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Email Corporativo</label>
          <input 
            id="email" name="email" type="email" required placeholder="tu@empresa.com"
            className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all placeholder:text-lttm shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
          />
        </div>

        <div className="flex flex-col space-y-1.5 pt-1">
          <label htmlFor="password" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Contraseña segura</label>
          <input 
            id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres"
            className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all placeholder:text-lttm shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
          />
        </div>

        <div className="pt-3">
          <Button type="submit" className="w-full bg-gradient-to-br from-brand-cyan to-cyan-light text-white shadow-[0_2px_12px_#00adef30] hover:translate-y-[-1px] hover:shadow-[0_4px_18px_#00adef45] transition-all border-none font-sora font-medium py-2 h-auto rounded-[7px]">
            Crear cuenta de empresa
          </Button>
        </div>
        <div className="text-center pt-2">
          <p className="font-sora text-[12.5px] text-lttm">
            ¿Ya tienes cuenta? <Link href="/login" className="text-brand-blue font-medium hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
