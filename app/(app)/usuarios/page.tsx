'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Mail, Loader2, Copy, Check, X,
  ChevronRight, ShieldAlert, AlertCircle, ClipboardList, Shield,
} from 'lucide-react';
import {
  getOrganizationMembersAndInvitations,
  inviteUser,
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  cancelInvitation,
} from './actions';
import { MiembrosTab }    from './tabs/miembros';
import { InvitacionesTab } from './tabs/invitaciones';
import { RolesTab }       from './tabs/roles';
import { AuditoriaTab }   from './tabs/auditoria';
import { INVITABLE_ROLES, ROLE_LABELS, inputCls, selectCls, SelectArrow, type Member, type Invitation } from './tabs/shared';

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'miembros' | 'invitaciones' | 'roles' | 'auditoria'

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'miembros',     label: 'Miembros',          icon: <Users size={14} /> },
  { key: 'invitaciones', label: 'Invitaciones',       icon: <Mail size={14} /> },
  { key: 'roles',        label: 'Roles y permisos',   icon: <Shield size={14} /> },
  { key: 'auditoria',    label: 'Auditoría',          icon: <ClipboardList size={14} /> },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('miembros')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [members, setMembers]               = useState<Member[]>([])
  const [inactiveMembers, setInactiveMembers] = useState<Member[]>([])
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  const [currentUserId, setCurrentUserId]   = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')

  const [isInviting, setIsInviting]   = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('viewer')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult]   = useState<{ token?: string; error?: string } | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setPageError(null)
    const result = await getOrganizationMembersAndInvitations()
    if ('success' in result && result.success) {
      setMembers((result as any).members)
      setInactiveMembers((result as any).inactiveMembers)
      setInvitations((result as any).invitations)
      setCurrentUserId((result as any).currentUserId)
      setCurrentUserRole((result as any).currentUserRole)
    } else {
      setPageError((result as any).error ?? 'Error al cargar los datos.')
    }
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteResult(null)
    const res = await inviteUser(inviteEmail, inviteRole)
    if (res.error) {
      setInviteResult({ error: res.error })
    } else {
      setInviteResult({ token: res.token })
      setInviteEmail('')
      setActiveTab('invitaciones')
      loadData()
    }
    setInviteLoading(false)
  }

  async function handleRoleChange(memberId: string, role: string) {
    await updateMemberRole(memberId, role)
    loadData()
  }

  async function handleDeactivate(memberId: string) {
    await deactivateMember(memberId)
    loadData()
  }

  async function handleReactivate(memberId: string) {
    await reactivateMember(memberId)
    loadData()
  }

  async function handleCancelInvite(id: string) {
    await cancelInvitation(id)
    loadData()
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/register?invite=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const isAdmin = currentUserRole === 'org_admin'

  // Pending invite count badge
  const pendingCount = invitations.filter((i) => new Date(i.expires_at) >= new Date()).length

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-plex text-lttm uppercase tracking-wider mb-4">
        <Users size={13} className="text-lttm" />
        <span>Configuración</span>
        <ChevronRight size={11} className="text-lttm" />
        <span className="text-ltt">Usuarios</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
            Gestión de Usuarios
          </h1>
          <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
            Gestiona el acceso al workspace, define roles y revisa invitaciones pendientes.
          </p>
        </div>
        {isAdmin && !isInviting && (
          <button
            onClick={() => { setIsInviting(true); setInviteResult(null) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[9px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] shrink-0"
          >
            <UserPlus size={15} />
            Invitar miembro
          </button>
        )}
      </div>

      {/* Page error */}
      {pageError && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Invite panel */}
      {isInviting && (
        <div className="bg-ltcard rounded-[12px] border border-[var(--cyan-border)] shadow-[0_8px_30px_rgba(0,173,239,0.06)] overflow-hidden mb-6 animate-fadein">
          <div className="bg-ltcard2 px-5 py-4 border-b border-ltb flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[8px] bg-cyan-dim flex items-center justify-center">
                <Mail size={14} className="text-brand-cyan" />
              </div>
              <div>
                <h3 className="font-sora text-[13px] font-semibold text-ltt">Nueva invitación</h3>
                <p className="font-sora text-[11.5px] text-lttm">El usuario accederá con el enlace de invitación.</p>
              </div>
            </div>
            <button
              onClick={() => { setIsInviting(false); setInviteResult(null) }}
              className="p-1 text-lttm hover:text-ltt transition-colors rounded-[6px] hover:bg-ltb"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-5">
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                  Correo electrónico <span className="text-re">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={inputCls}
                  placeholder="colaborador@empresa.com"
                />
              </div>
              <div className="w-full md:w-[230px]">
                <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                  Rol
                </label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className={selectCls}
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="h-[43px] px-6 bg-ltt text-white rounded-[8px] font-sora text-[13px] font-medium transition-colors hover:bg-ltt/90 flex items-center gap-2 shrink-0 disabled:opacity-60 whitespace-nowrap"
              >
                {inviteLoading && <Loader2 size={13} className="animate-spin" />}
                Generar enlace
              </button>
            </form>

            {inviteResult?.error && (
              <p className="mt-3 text-re text-[12px] font-sora">{inviteResult.error}</p>
            )}

            {inviteResult?.token && (
              <div className="mt-5 p-4 bg-grdim rounded-[9px] border border-grb">
                <p className="text-gr text-[13px] font-sora font-medium mb-1">Invitación creada.</p>
                <p className="text-gr text-[12px] font-sora mb-3 opacity-80">
                  Copia el enlace y envíaselo al usuario para que pueda unirse.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-ltcard border border-grb rounded-[7px] px-3 py-2 text-[11px] text-ltt font-plex truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${inviteResult.token}`}
                  </code>
                  <button
                    onClick={() => copyLink(inviteResult.token!)}
                    className="p-2 bg-ltcard border border-grb rounded-[7px] text-gr hover:bg-grdim transition-colors shrink-0 flex items-center justify-center w-9 h-9"
                    title="Copiar enlace"
                  >
                    {copiedToken === inviteResult.token ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="text-brand-cyan animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

          {/* Sidebar */}
          <nav
            aria-label="Secciones de usuarios"
            className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-2 lg:sticky lg:top-4 lg:self-start"
          >
            <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab
                return (
                  <li key={tab.key} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] font-sora text-[13px] text-left transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-cyan-dim text-brand-cyan font-medium'
                          : 'text-ltt2 hover:bg-ltbg hover:text-ltt'
                      }`}
                    >
                      <span className={isActive ? 'text-brand-cyan' : 'text-lttm'}>
                        {tab.icon}
                      </span>
                      <span className="flex-1">{tab.label}</span>
                      {tab.key === 'invitaciones' && pendingCount > 0 && (
                        <span className="bg-cyan-dim text-brand-cyan text-[10px] font-plex font-bold px-1.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="min-w-0">

            {activeTab === 'miembros' && (
              <MiembrosTab
                members={members}
                inactiveMembers={inactiveMembers}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onRoleChange={handleRoleChange}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            )}

            {activeTab === 'invitaciones' && (
              <InvitacionesTab
                invitations={invitations}
                isAdmin={isAdmin}
                onCancel={handleCancelInvite}
                onCopyLink={copyLink}
                copiedToken={copiedToken}
              />
            )}

            {activeTab === 'roles' && <RolesTab />}

            {activeTab === 'auditoria' && <AuditoriaTab />}

          </div>
        </div>
      )}
    </div>
  )
}
