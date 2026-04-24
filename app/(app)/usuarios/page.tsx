'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Users, UserPlus, Mail, Shield, ShieldAlert, Trash2, Key,
  Loader2, Copy, Check, Clock, X, ChevronDown,
} from 'lucide-react';
import {
  getOrganizationMembersAndInvitations,
  inviteUser,
  updateMemberRole,
  removeMember,
  cancelInvitation,
} from './actions';

type Member = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
};

const ROLE_LABELS: Record<string, string> = {
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
};

const ROLE_STYLES: Record<string, string> = {
  org_admin:          'bg-cyan-50 text-cyan-700 border-cyan-200',
  sgai_manager:       'bg-blue-50 text-blue-700 border-blue-200',
  caio:               'bg-purple-50 text-purple-700 border-purple-200',
  dpo:                'bg-indigo-50 text-indigo-700 border-indigo-200',
  system_owner:       'bg-teal-50 text-teal-700 border-teal-200',
  risk_analyst:       'bg-orange-50 text-orange-700 border-orange-200',
  compliance_analyst: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  executive:          'bg-pink-50 text-pink-700 border-pink-200',
  auditor:            'bg-red-50 text-red-700 border-red-200',
  viewer:             'bg-gray-100 text-gray-500 border-gray-200',
};

function MemberAvatar({ member, size = 40 }: { member: Pick<Member, 'first_name' | 'last_name' | 'avatar_url'>; size?: number }) {
  const initials = ((member.first_name?.[0] ?? '') + (member.last_name?.[0] ?? '')).toUpperCase() || '?';
  if (member.avatar_url) {
    return (
      <Image
        src={member.avatar_url}
        alt={initials}
        width={size}
        height={size}
        className="rounded-full object-cover border border-ltb"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="rounded-full bg-[var(--cyan-dim2)] border border-[var(--cyan-border)] flex items-center justify-center text-brand-cyan font-sora font-bold shrink-0"
    >
      {initials}
    </div>
  );
}

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10';

const selectCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none appearance-none pr-8 cursor-pointer transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10';

function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <ChevronDown size={12} />
    </div>
  );
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [data, setData] = useState<{
    members: Member[];
    invitations: Invitation[];
    currentUserRole: string;
    currentUserId: string;
  }>({ members: [], invitations: [], currentUserRole: '', currentUserId: '' });

  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setPageError(null);
    const result = await getOrganizationMembersAndInvitations();
    if (result.success) {
      setData(result as any);
    } else {
      setPageError((result as any).error);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);
    const res = await inviteUser(inviteEmail, inviteRole);
    if (res.error) {
      setInviteResult({ error: res.error });
    } else {
      setInviteResult({ token: res.token });
      setInviteEmail('');
      loadData();
    }
    setInviteLoading(false);
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    await updateMemberRole(memberId, role);
    loadData();
  };

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    await removeMember(memberId);
    setConfirmRemove(null);
    loadData();
    setRemovingId(null);
  };

  const handleCancelInvite = async (id: string) => {
    await cancelInvitation(id);
    loadData();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/onboarding?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const isAdmin = data.currentUserRole === 'admin';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
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
            onClick={() => { setIsInviting(true); setInviteResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Invitar miembro
          </button>
        )}
      </div>

      {pageError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-[13px] font-sora p-4 rounded-lg mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Invite form */}
      {isInviting && (
        <div className="bg-ltcard rounded-[12px] border border-brand-cyan/30 shadow-[0_8px_30px_rgba(0,173,239,0.06)] overflow-hidden mb-6 animate-fadein">
          <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--cyan-dim2)] flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-brand-cyan" />
              </div>
              <div>
                <h3 className="font-sora text-[13.5px] font-semibold text-ltt">Nueva invitación</h3>
                <p className="font-sora text-[11.5px] text-ltt2">El usuario recibirá acceso al registrarse con el enlace.</p>
              </div>
            </div>
            <button
              onClick={() => { setIsInviting(false); setInviteResult(null); }}
              className="p-1 text-lttm hover:text-ltt transition-colors rounded-md hover:bg-ltb"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                  Correo electrónico <span className="text-re">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className={inputCls}
                  placeholder="colaborador@empresa.com"
                />
              </div>
              <div className="w-full md:w-[220px]">
                <label className="flex items-center gap-1.5 text-[10px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                  Rol
                </label>
                <div className="relative">
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={selectCls}>
                    <option value="viewer">Lector (Viewer)</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <SelectArrow />
                </div>
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="h-[43px] px-6 bg-ltt text-white rounded-lg font-sora text-[13px] font-medium transition-colors hover:bg-ltt/90 flex items-center gap-2 shrink-0 disabled:opacity-60"
              >
                {inviteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generar enlace
              </button>
            </form>

            {inviteResult?.error && (
              <p className="mt-4 text-re text-[12px] font-sora">{inviteResult.error}</p>
            )}

            {inviteResult?.token && (
              <div className="mt-5 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 text-[13px] font-sora mb-1 font-medium">Invitación creada correctamente.</p>
                <p className="text-green-700 text-[12px] font-sora mb-3">
                  Copia el enlace y envíaselo al usuario para que pueda unirse.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-[11px] text-ltt font-plex truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding?invite=${inviteResult.token}`}
                  </code>
                  <button
                    onClick={() => copyLink(inviteResult.token!)}
                    className="p-2 bg-white border border-green-200 rounded text-green-700 hover:bg-green-100 transition-colors shrink-0 flex items-center justify-center w-9 h-9"
                    title="Copiar enlace"
                  >
                    {copied === inviteResult.token ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Members table */}
          <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center gap-2">
              <Users className="w-4 h-4 text-lttm" />
              <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
                Miembros activos ({data.members.length})
              </h2>
            </div>

            {data.members.length === 0 ? (
              <div className="px-6 py-10 text-center text-lttm font-sora text-[13px]">No hay miembros.</div>
            ) : (
              <div className="divide-y divide-ltb">
                {data.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-6 py-4 hover:bg-ltbg/60 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <MemberAvatar member={member} size={40} />
                      <div className="min-w-0">
                        <p className="font-sora text-[13.5px] font-medium text-ltt flex items-center gap-2 flex-wrap">
                          {member.first_name || member.last_name
                            ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                            : <span className="text-lttm italic">Sin nombre</span>}
                          {member.user_id === data.currentUserId && (
                            <span className="bg-ltb px-1.5 py-0.5 rounded text-[10px] text-lttm font-plex uppercase">Tú</span>
                          )}
                        </p>
                        <p className="font-sora text-[12px] text-lttm mt-0.5 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden md:flex items-center gap-1.5 text-[11.5px] text-lttm font-sora">
                        <Clock size={11} className="shrink-0" />
                        <span>Desde {formatDate(member.created_at)}</span>
                      </div>

                      <div className="w-[160px]">
                        {isAdmin && member.user_id !== data.currentUserId ? (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={e => handleRoleChange(member.id, e.target.value)}
                              className="w-full bg-transparent border border-ltb rounded-md py-1.5 px-2.5 text-[12px] font-sora text-ltt2 hover:border-brand-cyan transition-colors outline-none cursor-pointer appearance-none pr-7"
                            >
                              <option value="viewer">Lector</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Administrador</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
                              <ChevronDown size={11} />
                            </div>
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-plex uppercase tracking-wider border ${ROLE_STYLES[member.role] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {member.role === 'admin' && <ShieldAlert size={11} />}
                            {member.role === 'editor' && <Shield size={11} />}
                            {member.role === 'viewer' && <Users size={11} />}
                            {ROLE_LABELS[member.role] ?? member.role}
                          </div>
                        )}
                      </div>

                      {isAdmin && member.user_id !== data.currentUserId && (
                        <div className="w-8 flex items-center justify-center">
                          {confirmRemove === member.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRemove(member.id)}
                                disabled={removingId === member.id}
                                className="px-2 py-1 bg-re text-white rounded text-[11px] font-sora transition-colors hover:bg-re/90 disabled:opacity-60 flex items-center gap-1"
                              >
                                {removingId === member.id ? <Loader2 size={11} className="animate-spin" /> : null}
                                Confirmar
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="px-2 py-1 border border-ltb text-lttm rounded text-[11px] font-sora hover:bg-ltb transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(member.id)}
                              className="p-1.5 text-lttm hover:bg-red-50 hover:text-re rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Eliminar miembro"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {(data.invitations.length > 0 || isAdmin) && (
            <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center gap-2">
                <Key className="w-4 h-4 text-lttm" />
                <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">
                  Invitaciones pendientes ({data.invitations.length})
                </h2>
              </div>

              {data.invitations.length === 0 ? (
                <div className="px-6 py-8 text-center text-lttm font-sora text-[13px]">
                  No hay invitaciones pendientes.
                </div>
              ) : (
                <div className="divide-y divide-ltb">
                  {data.invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between px-6 py-4 group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-sora text-[13.5px] font-medium text-ltt">{inv.email}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-plex uppercase tracking-wider border ${ROLE_STYLES[inv.role] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {ROLE_LABELS[inv.role] ?? inv.role}
                            </span>
                            <span className="text-[11.5px] text-lttm font-sora flex items-center gap-1">
                              <Clock size={10} />
                              Expira {formatDate(inv.expires_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copyLink(inv.token)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-ltb rounded-lg text-[12px] font-sora text-ltt2 hover:border-brand-cyan hover:text-brand-cyan transition-colors"
                        >
                          {copied === inv.token ? <Check size={13} /> : <Copy size={13} />}
                          {copied === inv.token ? 'Copiado' : 'Copiar enlace'}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="p-1.5 text-lttm hover:bg-red-50 hover:text-re rounded-md transition-colors"
                            title="Cancelar invitación"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Role reference */}
          <div className="bg-ltcard rounded-[12px] border border-ltb overflow-hidden">
            <div className="bg-ltcard2 px-6 py-4 border-b border-ltb">
              <h2 className="font-plex text-xs font-semibold text-ltt2 uppercase tracking-[0.8px]">Roles y permisos</h2>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { role: 'admin', icon: <ShieldAlert size={16} />, label: 'Administrador', desc: 'Acceso completo. Puede gestionar miembros, cambiar roles, editar la organización y acceder a todos los módulos.' },
                { role: 'editor', icon: <Shield size={16} />, label: 'Editor', desc: 'Puede crear y editar registros en todos los módulos activos, pero no gestiona usuarios ni configuración organizativa.' },
                { role: 'viewer', icon: <Users size={16} />, label: 'Lector', desc: 'Acceso de sólo lectura. Puede consultar datos y generar informes, pero no puede modificar ningún registro.' },
              ].map(({ role, icon, label, desc }) => (
                <div key={role} className="flex gap-3 p-4 bg-ltbg rounded-lg border border-ltb">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ROLE_STYLES[role]} border`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-sora text-[13px] font-semibold text-ltt mb-1">{label}</p>
                    <p className="font-sora text-[12px] text-ltt2 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
