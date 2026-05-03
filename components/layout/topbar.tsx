'use client'

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { NotificationsBell } from "@/components/notifications/NotificationsBell"
import { useAuthStore } from "@/lib/store/authStore"

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { loadUserData, profile, role, user, signOut, isLoading } = useAuthStore()

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Cerrar el menú si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedTrigger = triggerRef.current?.contains(target)
      const clickedMenu = menuRef.current?.contains(target)

      if (!clickedTrigger && !clickedMenu) {
        setMenuOpen(false)
      }
    }

    function handleResize() {
      if (!menuOpen || !triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("resize", handleResize)
    }
  }, [menuOpen])

  // Obtener el título dinámico según la ruta
  const getPageTitle = () => {
    if (pathname?.includes('/inventario/nuevo')) return "Nuevo Sistema IA"
    if (pathname?.match(/\/inventario\/.+/)) return "Detalle del Sistema"
    if (pathname?.includes('/inventario')) return "Inventario de Sistemas"
    if (pathname?.includes('/evaluaciones')) return "Evaluación"
    if (pathname?.includes('/gaps')) return "Análisis de Gaps"
    if (pathname?.includes('/evidencias')) return "Evidencias"
    if (pathname?.includes('/datos')) return "Datos"
    if (pathname?.includes('/organizacion')) return "Organización"
    if (pathname?.includes('/usuarios')) return "Usuarios"
    if (pathname?.includes('/ajustes')) return "Ajustes"
    return "Dashboard"
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    router.replace('/login')
    router.refresh()
  }

  const toggleMenu = () => {
    if (!triggerRef.current) {
      setMenuOpen((prev) => !prev)
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
    setMenuOpen((prev) => !prev)
  }

  const displayName = (profile?.display_name || profile?.full_name || '').trim()
    || user?.email?.split('@')[0]
    || (isLoading ? 'Cargando' : 'Usuario')

  const initials = (profile?.display_name || profile?.full_name || user?.email || '?')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
    || '?'

  return (
    <header className="flex-shrink-0 h-[52px] bg-dk8 border-b border-dkb flex items-center justify-between px-6 z-[60] relative">
      <h1 className="font-sora text-[15px] font-semibold text-dkt">{getPageTitle()}</h1>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <div className="relative" ref={containerRef}>
        <button 
          ref={triggerRef}
          type="button"
          onClick={toggleMenu}
          className="flex items-center gap-3 hover:bg-dk7 p-1.5 rounded-[10px] transition-colors text-left border border-transparent hover:border-dkb"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="flex flex-col items-end">
            <span className="font-sora text-[13px] font-semibold text-dkt leading-tight">
              {displayName}
            </span>
            <span className="font-plex text-[10px] text-dkt2 leading-tight">
              {{
                org_admin:          'Administrador',
                sgai_manager:       'SGAI Manager',
                caio:               'CAIO',
                dpo:                'DPO',
                system_owner:       'System Owner',
                risk_analyst:       'Analista de Riesgos',
                compliance_analyst: 'Analista de Cumplimiento',
                executive:          'Directivo',
                auditor:            'Auditor',
                viewer:             'Lector',
              }[role ?? ''] ?? 'Lector'}
            </span>
          </div>
          <div className="w-[34px] h-[34px] rounded-full overflow-hidden bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-white font-sora text-[13px] font-bold shadow-[0_2px_8px_rgba(0,173,239,0.3)] border-[1.5px] border-dk8 shrink-0 relative">
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
              : (initials || '?')
            }
          </div>
          <ChevronDown size={14} className={`text-dktm transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed w-[200px] bg-dk8 border border-dkb rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-1.5 overflow-hidden z-[120]"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <Link
              href="/perfil"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-sora text-dkt hover:bg-dk7 transition-colors text-left"
            >
              <User size={14} className="text-dktm" />
              <span>Mi Perfil</span>
            </Link>
            <Link
              href="/ajustes"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-sora text-dkt hover:bg-dk7 transition-colors text-left"
            >
              <Settings size={14} className="text-dktm" />
              <span>Ajustes</span>
            </Link>
            <div className="h-[1px] bg-dkb my-1"></div>
            <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-sora text-[#f87171] hover:bg-[#f87171]/10 transition-colors text-left">
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
