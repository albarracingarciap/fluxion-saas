'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Users, UserPlus, Mail, Loader2, Copy, Check, X,
  AlertCircle, ClipboardList, Shield, ToggleLeft, ToggleRight,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import {
  getOrganizationMembersAndInvitations,
  inviteUser,
  inviteUserBulk,
  resendInvitation,
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  cancelInvitation,
} from './actions';
import { MiembrosTab }    from './tabs/miembros';
import { InvitacionesTab } from './tabs/invitaciones';
import { RolesTab }       from './tabs/roles';
import { AuditoriaTab }   from './tabs/auditoria';
import { MemberDrawer }   from './tabs/member-drawer';
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

  const [isInviting, setIsInviting]     = useState(false)
  const [bulkMode, setBulkMode]         = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteBulk, setInviteBulk]     = useState('')
  const [inviteRole, setInviteRole]     = useState('viewer')
  const [inviteMessage, setInviteMessage] = useState('')
  const [showMessage, setShowMessage]   = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{
    token?: string
    error?: string
    bulk?: Array<{ email: string; token?: string; error?: string }>
  } | null>(null)
  const [copiedToken, setCopiedToken]   = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setPageError(null)
    const result = await getOrganizationMembersAndInvitations()
    if ('success' in result && result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMembers((result as any).members)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInactiveMembers((result as any).inactiveMembers)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInvitations((result as any).invitations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCurrentUserId((result as any).currentUserId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCurrentUserRole((result as any).currentUserRole)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPageError((result as any).error ?? 'Error al cargar los datos.')
    }
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteResult(null)

    if (bulkMode) {
      const emails = inviteBulk
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'))
      if (emails.length === 0) {
        setInviteResult({ error: 'No se encontraron emails válidos.' })
        setInviteLoading(false)
        return
      }
      const res = await inviteUserBulk(emails, inviteRole, inviteMessage)
      if ('error' in res) {
        setInviteResult({ error: res.error })
      } else {
        setInviteResult({ bulk: res.results })
        setInviteBulk('')
        setActiveTab('invitaciones')
        loadData()
      }
    } else {
      const res = await inviteUser(inviteEmail, inviteRole, inviteMessage)
      if (res.error) {
        setInviteResult({ error: res.error })
      } else {
        setInviteResult({ token: res.token })
        setInviteEmail('')
        setActiveTab('invitaciones')
        loadData()
      }
    }
    setInviteLoading(false)
  }

  async function handleResend(invId: string) {
    const res = await resendInvitation(invId)
    loadData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { token: res.success ? (res as any).token : undefined, error: (res as any).error }
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

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-7">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Volver al dashboard
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Configuración · Usuarios</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Gestión de Usuarios</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Gestiona el acceso al workspace, define roles y revisa invitaciones pendientes.
            </p>
          </div>
          {isAdmin && !isInviting && (
            <button
              onClick={() => { setIsInviting(true); setInviteResult(null) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all shrink-0"
            >
              <UserPlus size={15} />
              Invitar miembro
            </button>
          )}
        </div>
      </section>

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
          {/* Panel header */}
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
            <div className="flex items-center gap-3">
              {/* Bulk toggle */}
              <button
                type="button"
                onClick={() => { setBulkMode(!bulkMode); setInviteResult(null) }}
                className="flex items-center gap-1.5 text-[11.5px] font-sora text-lttm hover:text-ltt transition-colors"
              >
                {bulkMode ? <ToggleRight size={16} className="text-brand-cyan" /> : <ToggleLeft size={16} />}
                Invitación múltiple
              </button>
              <button
                onClick={() => { setIsInviting(false); setInviteResult(null); setBulkMode(false); setShowMessage(false) }}
                className="p-1 text-lttm hover:text-ltt transition-colors rounded-[6px] hover:bg-ltb"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-end gap-4">
                {/* Email(s) */}
                <div className="flex-1 w-full">
                  <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                    {bulkMode ? 'Correos electrónicos' : 'Correo electrónico'}
                    <span className="text-re">*</span>
                  </label>
                  {bulkMode ? (
                    <>
                      <textarea
                        required
                        rows={4}
                        value={inviteBulk}
                        onChange={(e) => setInviteBulk(e.target.value)}
                        className={inputCls + ' resize-none'}
                        placeholder={'usuario1@empresa.com\nusuario2@empresa.com\nusuario3@empresa.com'}
                      />
                      <p className="font-sora text-[11px] text-lttm mt-1">Un email por línea, o separados por coma.</p>
                    </>
                  ) : (
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className={inputCls}
                      placeholder="colaborador@empresa.com"
                    />
                  )}
                </div>

                {/* Role */}
                <div className="w-full md:w-[210px]">
                  <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                    Rol
                  </label>
                  <div className="relative">
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={selectCls}>
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <SelectArrow />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="h-[43px] px-5 bg-ltt text-white rounded-[8px] font-sora text-[13px] font-medium transition-colors hover:bg-ltt/90 flex items-center gap-2 shrink-0 disabled:opacity-60 whitespace-nowrap"
                >
                  {inviteLoading && <Loader2 size={13} className="animate-spin" />}
                  {bulkMode ? 'Invitar todos' : 'Generar enlace'}
                </button>
              </div>

              {/* Mensaje opcional */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMessage(!showMessage)}
                  className="flex items-center gap-1.5 text-[11.5px] font-sora text-lttm hover:text-ltt transition-colors"
                >
                  <MessageSquare size={13} />
                  {showMessage ? 'Ocultar mensaje' : 'Añadir mensaje personal (opcional)'}
                </button>
                {showMessage && (
                  <textarea
                    rows={2}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className={inputCls + ' resize-none mt-2'}
                    placeholder="Ej. Hola, te invito a unirte al workspace de Fluxion para gestionar el SGAI de nuestra organización."
                    maxLength={300}
                  />
                )}
              </div>
            </form>

            {/* Error */}
            {inviteResult?.error && (
              <p className="mt-3 text-re text-[12px] font-sora">{inviteResult.error}</p>
            )}

            {/* Single success */}
            {inviteResult?.token && (
              <div className="mt-4 p-4 bg-grdim rounded-[9px] border border-grb">
                <p className="text-gr text-[13px] font-sora font-medium mb-1">Invitación creada.</p>
                <p className="text-gr text-[12px] font-sora mb-3 opacity-80">
                  Copia el enlace y envíaselo al usuario.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-ltcard border border-grb rounded-[7px] px-3 py-2 text-[11px] text-ltt font-plex truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${inviteResult.token}`}
                  </code>
                  <button
                    onClick={() => copyLink(inviteResult.token!)}
                    className="p-2 bg-ltcard border border-grb rounded-[7px] text-gr hover:bg-grdim transition-colors shrink-0 flex items-center justify-center w-9 h-9"
                  >
                    {copiedToken === inviteResult.token ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk results */}
            {inviteResult?.bulk && (
              <div className="mt-4 flex flex-col gap-1.5">
                {inviteResult.bulk.map((r) => (
                  <div key={r.email} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-[7px] border text-[12px] font-sora ${
                    r.error ? 'bg-red-dim border-reb' : 'bg-grdim border-grb'
                  }`}>
                    <span className={r.error ? 'text-re' : 'text-gr'}>{r.email}</span>
                    {r.error ? (
                      <span className="text-re text-[11px]">{r.error}</span>
                    ) : (
                      <button
                        onClick={() => copyLink(r.token!)}
                        className="flex items-center gap-1 text-gr hover:opacity-80 transition-opacity shrink-0"
                      >
                        {copiedToken === r.token ? <Check size={12} /> : <Copy size={12} />}
                        <span className="text-[11px]">Copiar enlace</span>
                      </button>
                    )}
                  </div>
                ))}
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
                onSelectMember={(id) => setSelectedMemberId(id)}
              />
            )}

            {activeTab === 'invitaciones' && (
              <InvitacionesTab
                invitations={invitations}
                isAdmin={isAdmin}
                onCancel={handleCancelInvite}
                onResend={handleResend}
                onCopyLink={copyLink}
                copiedToken={copiedToken}
              />
            )}

            {activeTab === 'roles' && <RolesTab />}

            {activeTab === 'auditoria' && <AuditoriaTab />}

          </div>
        </div>
      )}

      <MemberDrawer
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />
    </div>
  )
}
