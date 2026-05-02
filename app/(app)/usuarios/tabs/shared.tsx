import Image from 'next/image';
import { ShieldAlert, Shield, UserCheck, Eye } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Member = {
  id: string
  user_id: string
  role: string
  created_at: string
  full_name: string | null
  avatar_url: string | null
  email: string
  is_active: boolean
}

export type RoleChange = {
  id: string
  change_type: 'role_change' | 'deactivated' | 'reactivated' | 'removed'
  prev_role: string | null
  new_role: string | null
  reason: string | null
  created_at: string
  actor_id: string
  member_id: string
  actor_name: string
  member_name: string
}

export type Invitation = {
  id: string
  email: string
  role: string
  token: string
  created_at: string
  expires_at: string
}

// ─── Role catalog ─────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
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
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  org_admin:          'Acceso completo. Gestiona miembros, roles, organización y todos los módulos.',
  sgai_manager:       'Responsable del Sistema de Gestión de IA. Coordina el ciclo de gobernanza.',
  caio:               'Chief AI Officer. Supervisión estratégica de la cartera de sistemas IA.',
  dpo:                'Data Protection Officer. Responsable de cumplimiento en protección de datos.',
  system_owner:       'Propietario de uno o varios sistemas IA. Gestiona su ciclo de vida.',
  risk_analyst:       'Evalúa y mitiga riesgos de los sistemas IA mediante FMEA y análisis causal.',
  compliance_analyst: 'Verifica el cumplimiento frente a AI Act, ISO 42001 y normativa aplicable.',
  executive:          'Directivo con acceso de lectura a KPIs y resúmenes ejecutivos.',
  auditor:            'Acceso de auditoría de solo lectura a todos los módulos y evidencias.',
  viewer:             'Acceso de consulta. Puede leer datos e informes pero no modificar registros.',
}

export const INVITABLE_ROLES = [
  'viewer', 'auditor', 'executive', 'compliance_analyst',
  'risk_analyst', 'system_owner', 'dpo', 'caio', 'sgai_manager',
] as const

// Badge styles using only CSS-variable-based classes (dark mode safe)
export const ROLE_BADGE_CLS: Record<string, string> = {
  org_admin:          'bg-cyan-dim border-[var(--cyan-border)] text-brand-cyan',
  sgai_manager:       'bg-[var(--cyan-dim2)] border-[var(--cyan-border)] text-brand-navy',
  caio:               'bg-ltcard2 border-ltbl text-ltt',
  dpo:                'bg-ltcard2 border-ltbl text-ltt',
  system_owner:       'bg-ltcard2 border-ltb text-ltt2',
  risk_analyst:       'bg-ltcard2 border-ltb text-ltt2',
  compliance_analyst: 'bg-ltcard2 border-ltb text-ltt2',
  executive:          'bg-ltcard2 border-ltb text-lttm',
  auditor:            'bg-ltcard2 border-ltb text-lttm',
  viewer:             'bg-ltcard2 border-ltb text-lttm',
}

function roleIcon(role: string) {
  if (role === 'org_admin') return <ShieldAlert size={10} />
  if (['caio', 'sgai_manager', 'dpo'].includes(role)) return <Shield size={10} />
  if (['system_owner', 'risk_analyst', 'compliance_analyst'].includes(role)) return <UserCheck size={10} />
  return <Eye size={10} />
}

export function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGE_CLS[role] ?? 'bg-ltcard2 border-ltb text-lttm'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border font-plex text-[10px] uppercase tracking-[0.6px] ${cls}`}>
      {roleIcon(role)}
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function MemberAvatar({ fullName, avatarUrl, size = 40 }: {
  fullName: string | null
  avatarUrl: string | null
  size?: number
}) {
  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={initials}
        width={size}
        height={size}
        className="rounded-full object-cover border border-ltb shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="rounded-full bg-[var(--cyan-dim2)] border border-[var(--cyan-border)] flex items-center justify-center text-brand-cyan font-sora font-bold shrink-0"
    >
      {initials}
    </div>
  )
}

// ─── Shared form styles ───────────────────────────────────────────────────────

export const inputCls = "w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50"
export const selectCls = inputCls + " appearance-none pr-8 cursor-pointer"

export function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </div>
  )
}

// ─── Date formatter ───────────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
