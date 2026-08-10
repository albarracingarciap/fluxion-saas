import type { RiskLevel } from '@/types/classification'

const RISK_CONFIG: Record<RiskLevel, { label: string; pill: string; text: string; border: string }> = {
  prohibited: { label: 'Prohibido',      pill: 'bg-redim',  text: 'text-re', border: 'border-reb' },
  high:       { label: 'Alto Riesgo',    pill: 'bg-redim',  text: 'text-re', border: 'border-reb' },
  limited:    { label: 'Riesgo Limitado',pill: 'bg-ordim',  text: 'text-or', border: 'border-orb' },
  minimal:    { label: 'Riesgo Mínimo',  pill: 'bg-grdim',  text: 'text-gr', border: 'border-grb' },
  pending:    { label: 'Pendiente',      pill: 'bg-ltcard2',text: 'text-lttm',border: 'border-ltb' },
}

interface RiskLevelBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

export function RiskLevelBadge({ level, size = 'md' }: RiskLevelBadgeProps) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.pending
  const sizeClass = size === 'sm'
    ? 'font-plex text-[10px] px-2 py-0.5 rounded-full'
    : size === 'lg'
    ? 'font-fraunces text-[20px] font-semibold'
    : 'font-plex text-[11px] px-2.5 py-1 rounded-full'

  if (size === 'lg') {
    return <span className={`${cfg.text} ${sizeClass}`}>{cfg.label}</span>
  }

  return (
    <span className={`inline-flex items-center border ${cfg.pill} ${cfg.text} ${cfg.border} ${sizeClass}`}>
      {cfg.label}
    </span>
  )
}

export { RISK_CONFIG }
