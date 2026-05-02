'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, Loader2, UserX, UserCheck, X, Clock, Users } from 'lucide-react';
import {
  MemberAvatar, RoleBadge, ROLE_LABELS, selectCls, SelectArrow, formatDate,
  type Member,
} from './shared';

const PAGE_SIZE = 20;

interface Props {
  members: Member[]
  inactiveMembers: Member[]
  currentUserId: string
  isAdmin: boolean
  onRoleChange: (memberId: string, role: string) => Promise<void>
  onDeactivate: (memberId: string) => Promise<void>
  onReactivate: (memberId: string) => Promise<void>
}

export function MiembrosTab({ members, inactiveMembers, currentUserId, isAdmin, onRoleChange, onDeactivate, onReactivate }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      const matchSearch = !q || (m.full_name ?? '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      const matchRole = !roleFilter || m.role === roleFilter
      return matchSearch && matchRole
    })
  }, [members, search, roleFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearchChange(v: string) {
    setSearch(v)
    setPage(1)
  }

  function handleRoleFilterChange(v: string) {
    setRoleFilter(v)
    setPage(1)
  }

  async function handleRoleChange(memberId: string, role: string) {
    setPendingRole(memberId)
    await onRoleChange(memberId, role)
    setPendingRole(null)
  }

  async function handleConfirmDeactivate() {
    if (!confirmDeactivateId) return
    setDeactivatingId(confirmDeactivateId)
    await onDeactivate(confirmDeactivateId)
    setDeactivatingId(null)
    setConfirmDeactivateId(null)
  }

  async function handleReactivate(memberId: string) {
    setReactivatingId(memberId)
    await onReactivate(memberId)
    setReactivatingId(null)
  }

  const memberToDeactivate = members.find(m => m.id === confirmDeactivateId)

  return (
    <>
      {/* Deactivate confirmation modal */}
      {confirmDeactivateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6 w-full max-w-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-[10px] bg-red-dim border border-reb flex items-center justify-center shrink-0">
                <UserX size={18} className="text-re" />
              </div>
              <button
                onClick={() => setConfirmDeactivateId(null)}
                className="p-1 text-lttm hover:text-ltt transition-colors rounded-md hover:bg-ltbg"
              >
                <X size={16} />
              </button>
            </div>
            <h3 className="font-sora text-[14px] font-semibold text-ltt mb-1">¿Desactivar miembro?</h3>
            <p className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-5">
              <span className="font-medium text-ltt">{memberToDeactivate?.full_name || memberToDeactivate?.email}</span> perderá el acceso al workspace. Sus datos se conservan y puede reactivarse en cualquier momento.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDeactivateId(null)}
                className="flex-1 px-4 py-2 border border-ltb rounded-[8px] font-sora text-[13px] text-ltt2 hover:bg-ltbg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeactivate}
                disabled={!!deactivatingId}
                className="flex-1 px-4 py-2 bg-re text-white rounded-[8px] font-sora text-[13px] font-medium hover:bg-re/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deactivatingId ? <Loader2 size={13} className="animate-spin" /> : null}
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full bg-ltbg border border-ltb rounded-[8px] pl-9 pr-3 py-2 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10"
          />
        </div>
        <div className="relative w-[190px]">
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className={selectCls + ' py-2 text-[12.5px]'}
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <SelectArrow />
        </div>
        <span className="font-sora text-[12px] text-lttm shrink-0">
          {filtered.length} {filtered.length === 1 ? 'miembro' : 'miembros'}
        </span>
      </div>

      {/* Table */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
          <Users size={14} className="text-lttm" />
          <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
            Miembros activos ({members.length})
          </span>
        </div>

        {paged.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-sora text-[13px] text-lttm">
              {search || roleFilter ? 'No se encontraron miembros con estos filtros.' : 'No hay miembros.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ltb">
            {paged.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-ltbg/60 transition-colors group"
              >
                {/* Left: avatar + name + email */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <MemberAvatar fullName={member.full_name} avatarUrl={member.avatar_url} size={38} />
                  <div className="min-w-0">
                    <p className="font-sora text-[13px] font-medium text-ltt flex items-center gap-2 flex-wrap">
                      {member.full_name ?? <span className="text-lttm italic">Sin nombre</span>}
                      {member.user_id === currentUserId && (
                        <span className="bg-ltb px-1.5 py-0.5 rounded text-[9.5px] text-lttm font-plex uppercase tracking-wider">
                          Tú
                        </span>
                      )}
                    </p>
                    <p className="font-sora text-[11.5px] text-lttm truncate mt-0.5">{member.email}</p>
                  </div>
                </div>

                {/* Right: date + role selector/badge + remove */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center gap-1 text-[11px] text-lttm font-sora">
                    <Clock size={10} className="shrink-0" />
                    <span>{formatDate(member.created_at)}</span>
                  </div>

                  <div className="w-[185px]">
                    {isAdmin && member.user_id !== currentUserId ? (
                      <div className="relative">
                        <select
                          value={member.role}
                          disabled={pendingRole === member.id}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="w-full bg-ltcard border border-ltb rounded-[7px] py-1.5 px-2.5 text-[12px] font-sora text-ltt2 hover:border-brand-cyan transition-colors outline-none cursor-pointer appearance-none pr-7 disabled:opacity-50"
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
                          {pendingRole === member.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <ChevronDown size={11} />}
                        </div>
                      </div>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </div>

                  <div className="w-7 flex items-center justify-center">
                    {isAdmin && member.user_id !== currentUserId && (
                      <button
                        onClick={() => setConfirmDeactivateId(member.id)}
                        className="p-1.5 text-lttm hover:bg-red-dim hover:text-re rounded-[6px] transition-colors opacity-0 group-hover:opacity-100"
                        title="Desactivar miembro"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="font-sora text-[12px] text-lttm">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[12px] text-ltt2 hover:bg-ltbg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[12px] text-ltt2 hover:bg-ltbg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div className="mt-6 bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden opacity-80">
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
            <UserX size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Desactivados ({inactiveMembers.length})
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {inactiveMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-ltbg/40 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="opacity-50">
                    <MemberAvatar fullName={member.full_name} avatarUrl={member.avatar_url} size={38} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sora text-[13px] font-medium text-lttm">
                      {member.full_name ?? <span className="italic">Sin nombre</span>}
                    </p>
                    <p className="font-sora text-[11.5px] text-lttm truncate opacity-70">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RoleBadge role={member.role} />
                  {isAdmin && (
                    <button
                      onClick={() => handleReactivate(member.id)}
                      disabled={reactivatingId === member.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[11.5px] text-ltt2 hover:border-gr hover:text-gr transition-colors disabled:opacity-50"
                    >
                      {reactivatingId === member.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <UserCheck size={12} />}
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
