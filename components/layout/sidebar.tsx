'use client'

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSidebarStore } from "@/lib/store/sidebarStore"
import {
  LayoutDashboard, ChevronDown, List, FileCheck,
  Database, Building2, Users, Settings, PanelLeftClose, PanelLeftOpen, ClipboardList,
  ShieldCheck, CheckSquare, LayoutGrid,
} from "lucide-react"

type Child = { label: string; href: string; disabled?: boolean; hint?: string; activeOn?: string[]; exact?: boolean }
type NavItem = {
  label: string
  href?: string
  icon: React.ReactNode
  children?: Child[]
  disabled?: boolean
  hint?: string
}
type NavSection = { group: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    group: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={15} /> },
      {
        label: "Sistemas", icon: <List size={15} />,
        children: [
          { label: "Inventario", href: "/inventario" },
          { label: "Análisis de Gaps", href: "/gaps" },
          { label: "Evidencias", href: "/evidencias" },
        ],
      },
    ],
  },
  {
    group: "Evaluación",
    items: [
      { label: "Evaluaciones", href: "/evaluaciones", icon: <FileCheck size={15} /> },
      { label: "Planes de tratamiento", href: "/planes", icon: <ShieldCheck size={15} /> },
    ],
  },
  {
    group: "Seguimiento",
    items: [
      { label: "Tareas", href: "/tareas", icon: <CheckSquare size={15} /> },
      { label: "Kanban", href: "/kanban", icon: <LayoutGrid size={15} /> },
    ],
  },
  {
    group: "Cumplimiento",
    items: [
      {
        label: "ISO 42001", icon: <ClipboardList size={15} />,
        children: [
          { label: "Declaración de Aplicabilidad", href: "/plantillas/soa-iso42001" },
        ],
      },
    ],
  },
  {
    group: "Datos",
    items: [
      {
        label: "Datos", icon: <Database size={15} />,
        children: [
          { label: "Base de datos", href: "/datos" },
          { label: "Modos de fallo", href: "/datos/modos-de-fallo", disabled: true, hint: "Próximamente" },
          { label: "Tipos de evidencia", href: "/datos/tipos-de-evidencia", disabled: true, hint: "Próximamente" },
          { label: "Plantillas de controles", href: "/datos/plantillas-de-controles", disabled: true, hint: "Próximamente" },
          { label: "Mappings", href: "/datos/mappings", disabled: true, hint: "Próximamente" },
          { label: "Obligación ↔ Evidencia", href: "/datos/mappings/obligacion-evidencia", disabled: true, hint: "Próximamente" },
          { label: "Modo ↔ Control", href: "/datos/mappings/modo-control", disabled: true, hint: "Próximamente" },
          { label: "Matches", href: "/datos/relaciones-causales" },
          { label: "Catálogo causal", href: "/datos/catalogo-causal" },
          { label: "Métricas", href: "/datos/metricas", disabled: true, hint: "Disponible cuando esta area se implemente" },
          { label: "Obligaciones", href: "/datos/obligaciones", disabled: true, hint: "Próximamente" },
          { label: "Taxonomía", href: "/datos/taxonomia", disabled: true, hint: "Próximamente" },
        ],
      },
    ],
  },
  {
    group: "Configuración",
    items: [
      { label: "Organización", href: "/organizacion", icon: <Building2 size={15} /> },
      { label: "Usuarios", href: "/usuarios", icon: <Users size={15} /> },
      { label: "Ajustes", href: "/ajustes", icon: <Settings size={15} /> },
    ],
  },
]

export type SidebarOrgState = {
  name: string
  role: string
  plan: string
  initials: string
  hasSystems: boolean
  logo_url?: string | null
}

const DEFAULT_SIDEBAR_ORG_STATE: SidebarOrgState = {
  name: 'Organización',
  role: 'Miembro',
  plan: 'Starter',
  initials: 'OR',
  hasSystems: false,
  logo_url: null,
}

// ── Tooltip wrapper ──────────────────────────────────────────
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className="flex"
      onMouseEnter={() => {
        const el = ref.current?.firstElementChild as HTMLElement | null
        if (el) {
          const rect = el.getBoundingClientRect()
          setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 })
        }
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
        >
          <div className="bg-dk6 border border-dkb text-dkt font-sora text-[11.5px] px-2.5 py-1.5 rounded-[7px] whitespace-nowrap shadow-lg">
            {label}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Active state helper ──────────────────────────────────────
function isChildActive(child: Child, pathname: string | null): boolean {
  if (child.disabled) return false;
  if (child.activeOn?.some((pattern) => pathname?.includes(pattern))) return true;
  if (child.exact) return pathname === child.href;

  // Regla de exclusión: Inventario no es activo si estamos en FMEA
  if (child.label === 'Inventario' && pathname?.includes('/fmea')) return false;

  // Regla de inclusión: Evaluacion sistema solo si es FMEA (ya cubierto por activeOn si se prefiere, pero aqui lo aseguramos)
  if (child.label === 'Evaluación sistema' && !pathname?.includes('/fmea')) return false;

  return !!pathname && (pathname === child.href || pathname.startsWith(child.href + '/'));
}

// ── Expandable item ──────────────────────────────────────────
function ExpandableItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string | null;
  collapsed: boolean;
}) {
  const isAnyActive = useMemo(
    () => item.children?.some((c) => isChildActive(c, pathname)) ?? false,
    [item.children, pathname]
  );
  const [open, setOpen] = useState(isAnyActive);

  // Sincronizar apertura si cambia la ruta (opcional, pero ayuda a la consistencia)
  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  if (collapsed) {
    return (
      <Tip label={item.label}>
        <button
          className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
            isAnyActive
              ? 'bg-cyan-dim2 text-cyan-light border-cyan-border'
              : 'text-dkt2 border-transparent hover:bg-dk7 hover:text-dkt'
          }`}
        >
          {item.icon}
        </button>
      </Tip>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-[7px] rounded-lg mx-2 border transition-all font-sora text-[13px] ${
          isAnyActive
            ? 'bg-cyan-dim2 text-cyan-light border-cyan-border'
            : 'text-dkt2 border-transparent hover:bg-dk7 hover:text-dkt'
        }`}
      >
        <span className={isAnyActive ? 'text-cyan-light' : 'text-dkt2'}>{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={12}
          className={`text-dktm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="ml-[36px] mr-2 mt-0.5 mb-1 flex flex-col">
          {item.children!.map((child) => {
            const isActive = isChildActive(child, pathname);
            const baseClass = `flex items-center gap-2 px-3 py-[6px] rounded-lg text-[12.5px] font-sora transition-all border`;

            if (child.disabled) {
              return (
                <div
                  key={child.label}
                  title={child.hint}
                  className={`${baseClass} text-[#3f5f86] bg-[#102034] border-[#17314d] cursor-not-allowed`}
                >
                  <span className="w-1 h-1 rounded-full bg-[#4f739f] shrink-0" />
                  {child.label}
                </div>
              );
            }

            return (
              <Link
                key={child.label}
                href={child.href}
                className={`${baseClass} ${
                  isActive
                    ? 'text-cyan-light bg-cyan-dim2 border-cyan-border'
                    : 'text-dkt2 border-transparent hover:bg-dk7 hover:text-dkt'
                }`}
              >
                {isActive && <span className="w-1 h-1 rounded-full bg-brand-cyan shrink-0" />}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Nav group ────────────────────────────────────────────────
function NavGroup({ group, items, collapsed }: NavSection & { collapsed: boolean }) {
  const pathname = usePathname()
  return (
    <div>
      {!collapsed && (
        <div className="px-3 pb-1.5 pt-5 font-plex text-[9.5px] uppercase tracking-[1.2px] text-dkt2 first:pt-1">
          {group}
        </div>
      )}
      {collapsed && <div className="pt-4 pb-1 px-2"><div className="h-[1px] bg-dkb" /></div>}

      <div className={`flex flex-col ${collapsed ? "items-center gap-1 px-2" : ""}`}>
        {items.map((item) => {
          const isActive = item.href
            ? pathname === item.href || pathname?.startsWith(item.href + "/")
            : false

          if (item.children) {
            return <ExpandableItem key={item.label} item={item} pathname={pathname} collapsed={collapsed} />
          }

          if (collapsed) {
            return (
              <Tip key={item.label} label={item.label}>
                {item.disabled ? (
                  <div
                    title={item.hint}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border text-[#4f739f] bg-[#102034] border-[#17314d] cursor-not-allowed"
                  >
                    {item.icon}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-cyan-dim2 text-cyan-light border-cyan-border"
                        : "text-dkt2 border-transparent hover:bg-dk7 hover:text-dkt"
                    }`}
                  >
                    {item.icon}
                  </Link>
                )}
              </Tip>
            )
          }

          if (item.disabled) {
            return (
              <div
                key={item.label}
                title={item.hint}
                className="flex items-center gap-3 px-3 py-[7px] rounded-lg mx-2 border border-[#17314d] bg-[#102034] font-sora text-[13px] text-[#4f739f] cursor-not-allowed"
              >
                <span>{item.icon}</span>
                {item.label}
              </div>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`flex items-center gap-3 px-3 py-[7px] rounded-lg mx-2 border transition-all font-sora text-[13px] ${
                isActive
                  ? "bg-cyan-dim2 text-cyan-light border-cyan-border"
                  : "text-dkt2 border-transparent hover:bg-dk7 hover:text-dkt"
              }`}
            >
              <span className={isActive ? "text-cyan-light" : "text-dkt2"}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────
export function Sidebar({ initialOrgState = DEFAULT_SIDEBAR_ORG_STATE }: { initialOrgState?: SidebarOrgState }) {
  const { collapsed, toggle } = useSidebarStore()
  const [orgState] = useState<SidebarOrgState>(initialOrgState)

  const navSections = useMemo(() => {
    if (!orgState.hasSystems) return NAV

    return NAV.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        disabled: false,
        children: item.children?.map((child) => ({
          ...child,
          disabled: false,
          hint: undefined,
        })),
      })),
    }))
  }, [orgState.hasSystems])

  return (
    <aside
      className={`relative flex-shrink-0 bg-dk8 border-r border-dkb flex flex-col h-full z-10 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
        collapsed ? "w-[64px]" : "w-[228px]"
      }`}
    >
      {/* Borde derecho luminoso */}
      <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#00adef28] to-transparent pointer-events-none" />

      <div className={`flex flex-col flex-1 relative z-20 ${collapsed ? "px-2 py-4" : "p-4"}`}>

        {/* Logo + toggle button */}
        <div className={`flex items-center mb-2 ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          <div className={`bg-white rounded-[11px] flex items-center justify-center shadow-[0_4px_12px_#004aad20] cursor-pointer transition-all ${
            collapsed ? "w-10 h-10 p-1.5" : "flex-1 p-2 h-[52px]"
          }`}>
            {collapsed
              ? <Image src="/logo_2.png" alt="Fluxion" width={28} height={28} className="object-contain" />
              : <Image src="/fluxion.png" alt="Fluxion" width={120} height={36} className="h-9 w-auto object-contain" />
            }
          </div>
          <button
            onClick={toggle}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            className={`flex items-center justify-center w-7 h-7 rounded-lg text-dktm hover:text-dkt hover:bg-dk7 transition-all border border-transparent hover:border-dkb ${
              collapsed ? "" : "ml-2 shrink-0"
            }`}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 mt-1">
          {navSections.map((section) => (
            <NavGroup key={section.group} {...section} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      {/* Org chip */}
      <div className={`border-t border-dkb relative z-20 shrink-0 ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed ? (
          <Tip label={`${orgState.name} · ${orgState.role.toUpperCase()} · ${orgState.plan}`}>
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-[0_2px_8px_#00adef25] flex items-center justify-center cursor-pointer mx-auto shrink-0">
              {orgState.logo_url
                ? <Image src={orgState.logo_url} alt={orgState.name} width={40} height={40} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-white font-sora text-[12px] font-bold">{orgState.initials}</div>
              }
            </div>
          </Tip>
        ) : (
          <div className="bg-dk7 rounded-[9px] border border-dkb p-2 flex items-center space-x-3 cursor-pointer hover:bg-dk6 transition-colors">
            <div className="w-[30px] h-[30px] rounded-lg overflow-hidden shadow-[0_2px_8px_#00adef25] flex items-center justify-center shrink-0">
              {orgState.logo_url
                ? <Image src={orgState.logo_url} alt={orgState.name} width={30} height={30} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-white font-sora text-[12px] font-bold">{orgState.initials}</div>
              }
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-dkt font-sora text-[12px] font-medium leading-tight truncate">{orgState.name}</span>
              <span className="text-dkt2 font-plex text-[10px]">{orgState.role.toUpperCase()} · {orgState.plan}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
