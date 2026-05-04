'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, ShieldAlert, Users2, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle, X, UserPlus, Building2 } from 'lucide-react';
import { getCommittees, upsertCommittee, addCommitteeMember, removeCommitteeMember } from './actions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommitteeMember {
  id: string;
  committee_id: string;
  committee_role: string;
  is_active: boolean;
  joined_at: string;
  external_name: string | null;
  external_email: string | null;
  external_org: string | null;
  external_role_desc: string | null;
  profile_id: string | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null;
}

interface Committee {
  id: string;
  type: string;
  name: string;
  description: string | null;
  cadence_months: number;
  is_active: boolean;
  established_at: string | null;
  members: CommitteeMember[];
}

interface OrgProfile {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COMMITTEE_TYPES = [
  {
    type: 'ai_committee',
    label: 'Comité de IA',
    description: 'Supervisión operacional del SGAI. Revisa inventario, riesgos y tratamientos.',
    Icon: Bot,
  },
  {
    type: 'risk_committee',
    label: 'Comité de Riesgos de IA',
    description: 'Integración con el comité de riesgos corporativo. Revisa FMEA y apetito al riesgo.',
    Icon: ShieldAlert,
  },
  {
    type: 'director_review',
    label: 'Revisión por la Dirección',
    description: '§9.3 ISO 42001. Revisión periódica por la alta dirección del desempeño del SGAI.',
    Icon: Users2,
  },
];

const CADENCE_OPTIONS = [
  { value: 1,  label: 'Mensual' },
  { value: 3,  label: 'Trimestral' },
  { value: 6,  label: 'Semestral' },
  { value: 12, label: 'Anual' },
];

const COMMITTEE_ROLE_LABELS: Record<string, string> = {
  president: 'Presidente',
  secretary: 'Secretario',
  member:    'Miembro',
  advisor:   'Asesor',
};

const COMMITTEE_ROLE_STYLES: Record<string, string> = {
  president: 'bg-[#fff3cd] text-[#856404] border-[#ffc10740]',
  secretary: 'bg-[var(--cyan-dim2)] text-brand-navy border-brand-cyan/30',
  member:    'bg-ltcard2 text-ltt2 border-ltb',
  advisor:   'bg-[#e8f5e9] text-[#2e7d32] border-[#4caf5040]',
};

const inputCls = 'w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50';
const selectCls = inputCls + ' appearance-none cursor-pointer';

// ─── Sub-components ──────────────────────────────────────────────────────────

function MemberAvatar({ name, url }: { name: string | null; url: string | null }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? ''} className="w-8 h-8 rounded-full object-cover border border-ltb" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-ltcard2 border border-ltb flex items-center justify-center font-sora text-[11px] font-semibold text-ltt2 shrink-0">
      {initials}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return (
    <div className={`flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-[12.5px] font-sora mb-4 ${
      type === 'error'
        ? 'bg-redim border-reb text-re'
        : 'bg-grdim border-grb text-gr'
    }`}>
      {type === 'error'
        ? <AlertCircle className="w-4 h-4 shrink-0" />
        : <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ─── Committee Card ──────────────────────────────────────────────────────────

interface CommitteeCardProps {
  typeDef: typeof COMMITTEE_TYPES[number];
  committee: Committee | undefined;
  orgProfiles: OrgProfile[];
  organizationId: string;
  canManage: boolean;
  onRefresh: () => void;
}

function CommitteeCard({ typeDef, committee, orgProfiles, organizationId, canManage, onRefresh }: CommitteeCardProps) {
  const { type, label, description, Icon } = typeDef;

  const [showForm, setShowForm]         = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberType, setMemberType]     = useState<'internal' | 'external'>('internal');
  const [saving, setSaving]             = useState(false);
  const [toastMsg, setToastMsg]         = useState<string | null>(null);
  const [toastType, setToastType]       = useState<'error' | 'success'>('error');

  const [form, setForm] = useState({
    name:           label,
    description:    '',
    cadence_months: 3,
    established_at: '',
    is_active:      true,
  });

  const [memberForm, setMemberForm] = useState({
    profile_id:         '',
    external_name:      '',
    external_email:     '',
    external_org:       '',
    external_role_desc: '',
    committee_role:     'member',
  });

  useEffect(() => {
    if (committee) {
      setForm({
        name:           committee.name,
        description:    committee.description ?? '',
        cadence_months: committee.cadence_months,
        established_at: committee.established_at ?? '',
        is_active:      committee.is_active,
      });
    }
  }, [committee]);

  function toast(msg: string, type: 'error' | 'success' = 'error') {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  }

  async function handleSaveCommittee() {
    if (!form.name.trim()) return toast('El nombre es obligatorio.');
    setSaving(true);
    const res = await upsertCommittee({
      id:             committee?.id,
      organization_id: organizationId,
      type,
      name:           form.name.trim(),
      description:    form.description.trim(),
      cadence_months: form.cadence_months,
      established_at: form.established_at || undefined,
      is_active:      form.is_active,
    });
    setSaving(false);
    if (res.error) return toast(res.error);
    toast('Comité guardado correctamente.', 'success');
    setShowForm(false);
    onRefresh();
  }

  async function handleAddMember() {
    if (!committee) return;
    if (memberType === 'internal' && !memberForm.profile_id) return toast('Selecciona un miembro.');
    if (memberType === 'external' && !memberForm.external_email) return toast('El email es obligatorio para miembros externos.');
    setSaving(true);
    const res = await addCommitteeMember({
      committee_id:    committee.id,
      organization_id: organizationId,
      profile_id:         memberType === 'internal' ? memberForm.profile_id : null,
      external_name:      memberType === 'external' ? memberForm.external_name : undefined,
      external_email:     memberType === 'external' ? memberForm.external_email : undefined,
      external_org:       memberType === 'external' ? memberForm.external_org : undefined,
      external_role_desc: memberType === 'external' ? memberForm.external_role_desc : undefined,
      committee_role:  memberForm.committee_role,
    });
    setSaving(false);
    if (res.error) return toast(res.error);
    toast('Miembro añadido.', 'success');
    setShowAddMember(false);
    setMemberForm({ profile_id: '', external_name: '', external_email: '', external_org: '', external_role_desc: '', committee_role: 'member' });
    onRefresh();
  }

  async function handleRemoveMember(memberId: string) {
    const res = await removeCommitteeMember(memberId);
    if (res.error) return toast(res.error);
    onRefresh();
  }

  // Profiles not already in this committee
  const availableProfiles = orgProfiles.filter(
    (p) => !committee?.members.some((m) => m.profile_id === p.id)
  );

  const cadenceLabel = CADENCE_OPTIONS.find((o) => o.value === committee?.cadence_months)?.label ?? '';

  return (
    <div className={`rounded-[12px] border transition-all ${committee ? 'border-ltb bg-ltcard' : 'border-ltb bg-ltcard/60 opacity-80'} shadow-[0_2px_12px_rgba(0,0,0,0.04)]`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 p-6 pb-5">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-[10px] border flex items-center justify-center shrink-0 ${committee ? 'bg-[var(--cyan-dim2)] border-brand-cyan/30' : 'bg-ltcard2 border-ltb'}`}>
            <Icon size={18} className={committee ? 'text-brand-navy' : 'text-lttm'} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sora text-[14px] font-semibold text-ltt">{label}</h3>
              {committee && (
                <>
                  <span className="font-sora text-[11px] px-2 py-0.5 rounded-full border border-ltb bg-ltcard2 text-lttm">{cadenceLabel}</span>
                  {!committee.is_active && (
                    <span className="font-sora text-[11px] px-2 py-0.5 rounded-full border border-[#ffc10740] bg-[#fff3cd] text-[#856404]">Inactivo</span>
                  )}
                </>
              )}
            </div>
            {committee
              ? <p className="font-sora text-[12.5px] text-lttm mt-0.5 italic">&quot;{committee.name}&quot;</p>
              : <p className="font-sora text-[12.5px] text-lttm mt-0.5">{description}</p>}
            {committee?.established_at && (
              <p className="font-sora text-[11.5px] text-lttm mt-1">
                Constituido el {new Date(committee.established_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {committee && (
              <button
                onClick={() => { setShowForm(!showForm); setShowAddMember(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-ltb rounded-[8px] bg-ltcard2 hover:bg-ltbg text-lttm hover:text-ltt font-sora text-[12px] transition-all"
              >
                <Pencil size={12} />
                Editar
              </button>
            )}
            {!committee && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12px] font-medium shadow-[0_2px_10px_rgba(0,173,239,0.2)] hover:-translate-y-[1px] transition-all"
              >
                <Plus size={13} />
                Constituir
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="px-6 pb-2">
          <Toast msg={toastMsg} type={toastType} />
        </div>
      )}

      {/* Inline create/edit form */}
      {showForm && (
        <div className="mx-6 mb-5 p-4 rounded-[10px] border border-ltb bg-ltcard2">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-4">
            {committee ? 'Editar comité' : 'Constituir comité'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Nombre del comité *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder={`Ej. ${label} de ACME Corp`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="Alcance y objetivos del comité..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Cadencia de sesiones</label>
              <div className="flex gap-2 flex-wrap">
                {CADENCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm({ ...form, cadence_months: o.value })}
                    className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-all ${
                      form.cadence_months === o.value
                        ? 'border-brand-cyan bg-[var(--cyan-dim2)] text-brand-navy font-medium'
                        : 'border-ltb bg-ltcard text-ltt2 hover:border-ltbl'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Fecha de constitución</label>
              <input
                type="date"
                value={form.established_at}
                onChange={(e) => setForm({ ...form, established_at: e.target.value })}
                className={inputCls}
              />
            </div>
            {committee && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`active-${type}`}
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-cyan"
                />
                <label htmlFor={`active-${type}`} className="font-sora text-[13px] text-ltt">Comité activo</label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSaveCommittee}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50 transition-all hover:-translate-y-[1px]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-lttm hover:text-ltt hover:bg-ltcard2 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Members section */}
      {committee && (
        <div className="px-6 pb-6 border-t border-ltb pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
              Miembros activos ({committee.members.length})
            </p>
            {canManage && (
              <button
                onClick={() => { setShowAddMember(!showAddMember); setShowForm(false); }}
                className="flex items-center gap-1.5 text-[11.5px] font-sora text-brand-cyan hover:underline transition-all"
              >
                <UserPlus size={13} />
                Añadir miembro
              </button>
            )}
          </div>

          {/* Member list */}
          {committee.members.length === 0 ? (
            <p className="text-[12.5px] text-lttm font-sora italic">Sin miembros activos. Añade el primero.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {committee.members.map((m) => {
                const name = m.profiles?.full_name ?? m.external_name ?? '—';
                const sub  = m.profiles ? null : m.external_email;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-ltb bg-ltcard2 px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar name={name} url={m.profiles?.avatar_url ?? null} />
                      <div className="min-w-0">
                        <p className="font-sora text-[13px] text-ltt font-medium truncate">{name}</p>
                        {sub && <p className="font-sora text-[11px] text-lttm truncate">{sub}</p>}
                        {m.external_org && <p className="font-sora text-[11px] text-lttm truncate">{m.external_org}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-sora text-[11px] px-2 py-0.5 rounded-full border ${COMMITTEE_ROLE_STYLES[m.committee_role] ?? COMMITTEE_ROLE_STYLES.member}`}>
                        {COMMITTEE_ROLE_LABELS[m.committee_role] ?? m.committee_role}
                      </span>
                      {!m.profiles && (
                        <span className="font-sora text-[10.5px] px-1.5 py-0.5 rounded border border-ltb bg-ltcard text-lttm">Ext.</span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 rounded hover:bg-redim text-lttm hover:text-re transition-all"
                          title="Eliminar del comité"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add member form */}
          {showAddMember && canManage && (
            <div className="mt-4 p-4 rounded-[10px] border border-ltb bg-ltcard">
              <div className="flex items-center justify-between mb-3">
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Añadir miembro</p>
                <button onClick={() => setShowAddMember(false)} className="text-lttm hover:text-ltt">
                  <X size={14} />
                </button>
              </div>

              {/* Internal / External toggle */}
              <div className="flex gap-2 mb-4">
                {(['internal', 'external'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMemberType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-all ${
                      memberType === t
                        ? 'border-brand-cyan bg-[var(--cyan-dim2)] text-brand-navy font-medium'
                        : 'border-ltb bg-ltcard2 text-ltt2 hover:border-ltbl'
                    }`}
                  >
                    {t === 'internal' ? <Users2 size={13} /> : <Building2 size={13} />}
                    {t === 'internal' ? 'Interno' : 'Externo'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memberType === 'internal' ? (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Miembro *</label>
                    <select
                      value={memberForm.profile_id}
                      onChange={(e) => setMemberForm({ ...memberForm, profile_id: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">Selecciona un miembro...</option>
                      {availableProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Nombre completo</label>
                      <input
                        type="text"
                        value={memberForm.external_name}
                        onChange={(e) => setMemberForm({ ...memberForm, external_name: e.target.value })}
                        className={inputCls}
                        placeholder="Ej. María García"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Email *</label>
                      <input
                        type="email"
                        value={memberForm.external_email}
                        onChange={(e) => setMemberForm({ ...memberForm, external_email: e.target.value })}
                        className={inputCls}
                        placeholder="Ej. maria@auditora.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Organización</label>
                      <input
                        type="text"
                        value={memberForm.external_org}
                        onChange={(e) => setMemberForm({ ...memberForm, external_org: e.target.value })}
                        className={inputCls}
                        placeholder="Ej. Deloitte"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Cargo / Descripción</label>
                      <input
                        type="text"
                        value={memberForm.external_role_desc}
                        onChange={(e) => setMemberForm({ ...memberForm, external_role_desc: e.target.value })}
                        className={inputCls}
                        placeholder="Ej. Auditora externa ISO 42001"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Rol en el comité</label>
                  <select
                    value={memberForm.committee_role}
                    onChange={(e) => setMemberForm({ ...memberForm, committee_role: e.target.value })}
                    className={selectCls}
                  >
                    {Object.entries(COMMITTEE_ROLE_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleAddMember}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50 transition-all hover:-translate-y-[1px]"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus size={13} />}
                  {saving ? 'Añadiendo...' : 'Añadir'}
                </button>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-lttm hover:text-ltt hover:bg-ltcard2 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

export function CommitteesTab() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [committees, setCommittees]   = useState<Committee[]>([]);
  const [orgProfiles, setOrgProfiles] = useState<OrgProfile[]>([]);
  const [organizationId, setOrgId]    = useState<string>('');
  const [canManage, setCanManage]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCommittees();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.success) {
      setCommittees(res.committees as Committee[]);
      setOrgProfiles(res.orgProfiles as OrgProfile[]);
      setOrgId(res.organizationId!);
      setCanManage(['org_admin', 'sgai_manager', 'caio'].includes(res.currentUserRole!));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-redim border border-reb text-re text-[12.5px] font-sora p-4 rounded-[10px]">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1">
        <p className="font-sora text-[13px] text-ltt2 leading-relaxed">
          Gestiona los tres órganos de gobernanza del SGAI. Cada tipo de comité puede constituirse una sola vez por organización y admite miembros internos (con cuenta Fluxion) y externos (auditores, directivos externos, etc.).
        </p>
      </div>

      {COMMITTEE_TYPES.map((def) => (
        <CommitteeCard
          key={def.type}
          typeDef={def}
          committee={committees.find((c) => c.type === def.type)}
          orgProfiles={orgProfiles}
          organizationId={organizationId}
          canManage={canManage}
          onRefresh={load}
        />
      ))}
    </div>
  );
}
