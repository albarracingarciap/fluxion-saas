'use client'

import { useState } from "react"
import { X } from "lucide-react"

type AlertType = "critical" | "regulatory" | "agent" | "info"

type Alert = {
  id: string
  type: AlertType
  text: React.ReactNode
  href?: string
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: "a1",
    type: "critical",
    text: <><strong className="text-dkt">2 impactos críticos</strong> esta semana — plazos próximos</>,
  },
  {
    id: "a2",
    type: "regulatory",
    text: <><strong className="text-dkt">AESIA actualiza guía</strong> · Motor Scoring afectado</>,
    href: "/inventario",
  },
  {
    id: "a3",
    type: "agent",
    text: <>Discrepancia detectada: <strong className="text-dkt">MLflow v2.3.1 ≠ inventario v2.3</strong></>,
    href: "/inventario",
  },
  {
    id: "a4",
    type: "info",
    text: <><strong className="text-dkt">6</strong> sistemas · <strong className="text-dkt">3</strong> alto riesgo · Inventario 94% completo</>,
  },
]

const DOT_STYLES: Record<AlertType, string> = {
  critical:    "bg-re shadow-[0_0_8px_var(--re)] animate-pulse-custom",
  regulatory:  "bg-or shadow-[0_0_8px_var(--or)]",
  agent:       "bg-brand-cyan shadow-[0_0_8px_var(--brand-cyan)]",
  info:        "bg-gr shadow-[0_0_5px_var(--gr)]",
}

export function IntelBanner() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id))

  if (alerts.length === 0) return null

  return (
    <div className="relative flex-shrink-0 bg-dk9 border-b border-dkb px-[26px] overflow-hidden h-[50px]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#004aad08] via-[#00adef05] to-[#004aad08] pointer-events-none" />

      <div className="relative z-10 flex items-center h-full gap-0 overflow-x-auto scrollbar-none">
        {alerts.map((alert, idx) => (
          <div key={alert.id} className="flex items-center shrink-0">
            {/* Separador entre alertas */}
            {idx > 0 && <div className="w-[1px] h-[14px] bg-dkb mx-4 shrink-0" />}

            <div className="flex items-center gap-2 group">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_STYLES[alert.type]}`} />
              {alert.href ? (
                <a
                  href={alert.href}
                  className="font-plex text-[11px] text-dkt2 hover:text-dkt transition-colors cursor-pointer"
                >
                  {alert.text}
                </a>
              ) : (
                <span className="font-plex text-[11px] text-dkt2">{alert.text}</span>
              )}
              <button
                onClick={() => dismiss(alert.id)}
                className="ml-1 text-dktm hover:text-dkt transition-colors opacity-0 group-hover:opacity-100"
                title="Descartar alerta"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
