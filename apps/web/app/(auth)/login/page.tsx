import { Metadata } from "next"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { login } from "../actions"

export const metadata: Metadata = {
  title: "Iniciar sesión | Fluxion",
  description: "Accede a la plataforma de gobierno de IA Fluxion.",
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <div className="flex flex-col space-y-6 w-full max-w-[400px] bg-ltcard border border-ltb p-8 rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06]">
      <div className="flex flex-col space-y-2 text-center items-center">
        <Image
          src="/fluxion.png"
          alt="Fluxion Logo"
          width={140}
          height={40}
          className="h-10 w-auto mb-4"
          priority
        />
        <h1 className="text-2xl font-semibold tracking-tight text-ltt font-fraunces">
          Bienvenido a Fluxion
        </h1>
        <p className="text-[13.5px] text-ltt2 font-sora">
          Introduce tus datos para acceder a tu organización.
        </p>
      </div>

      {searchParams?.error && (
        <div className="bg-[#fdf0ef] border border-[#f0b4b0] text-[#d93025] px-4 py-3 rounded-lg flex items-center font-sora text-[13px] animate-fadein">
          ⚠️ {searchParams.error}
        </div>
      )}

      {searchParams?.message && (
        <div className="bg-[#eef8ff] border border-[#b8dffc] text-[#0b5cad] px-4 py-3 rounded-lg flex items-center font-sora text-[13px] animate-fadein">
          {searchParams.message}
        </div>
      )}
      
      <form action={login} className="flex flex-col space-y-4 pt-2">
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="email" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Email Corporativo</label>
          <input 
            id="email"
            name="email"
            type="email" 
            required
            placeholder="tu@empresa.com"
            className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all placeholder:text-lttm shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
          />
        </div>
        <div className="flex flex-col space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="font-plex text-[10.5px] uppercase text-lttm tracking-wider">Contraseña</label>
            <Link href="#" className="font-sora text-[11px] text-brand-cyan hover:underline">¿Olvidaste la contraseña?</Link>
          </div>
          <input 
            id="password"
            name="password"
            type="password" 
            required
            placeholder="••••••••"
            className="px-3 py-2 bg-ltcard border border-ltb rounded-lg font-sora text-[13.5px] text-ltt focus:border-brand-cyan outline-none transition-all placeholder:text-lttm shadow-[0_0_0_2px_transparent] focus:shadow-[0_0_0_3px_#00adef15]"
          />
        </div>
        <div className="pt-3">
          <Button type="submit" className="w-full bg-gradient-to-br from-brand-cyan to-cyan-light text-white shadow-[0_2px_12px_#00adef30] hover:translate-y-[-1px] hover:shadow-[0_4px_18px_#00adef45] transition-all border-none font-sora font-medium py-2 h-auto rounded-[7px]">
            Iniciar sesión
          </Button>
        </div>
        <div className="text-center pt-2">
          <p className="font-sora text-[12.5px] text-lttm">
            ¿No tienes cuenta? <Link href="/register" className="text-brand-blue font-medium hover:underline">Regístrate en Fluxion</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
