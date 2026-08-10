'use client';

import { useState } from 'react';
import { Key, Mail, Clock, Copy, Check, Trash2, AlertTriangle, RefreshCw, Loader2, MessageSquare } from 'lucide-react';
import { RoleBadge, formatDate, type Invitation } from './shared';

interface Props {
  invitations: Invitation[]
  isAdmin: boolean
  onCancel: (id: string) => Promise<void>
  onResend: (id: string) => Promise<{ token?: string; error?: string }>
  onCopyLink: (token: string) => void
  copiedToken: string | null
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date()
}

export function InvitacionesTab({ invitations, isAdmin, onCancel, onResend, onCopyLink, copiedToken }: Props) {
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendTokens, setResendTokens] = useState<Record<string, string>>({})

  const active  = invitations.filter((i) => !isExpired(i.expires_at))
  const expired = invitations.filter((i) =>  isExpired(i.expires_at))

  async function handleResend(inv: Invitation) {
    setResendingId(inv.id)
    const result = await onResend(inv.id)
    if (result.token) {
      setResendTokens((prev) => ({ ...prev, [inv.id]: result.token! }))
    }
    setResendingId(null)
  }

  function InviteRow({ inv }: { inv: Invitation }) {
    const expired   = isExpired(inv.expires_at)
    const liveToken = resendTokens[inv.id] ?? inv.token

    return (
      <div className="px-5 py-4 hover:bg-ltbg/60 transition-colors">
        <div className="flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
              expired ? 'bg-ltcard2 border-ltb' : 'bg-ltcard2 border-[var(--cyan-border)]'
            }`}>
              <Mail size={15} className={expired ? 'text-lttm' : 'text-brand-cyan'} />
            </div>
            <div className="min-w-0">
              <p className={`font-sora text-[13px] font-medium truncate ${expired ? 'text-lttm' : 'text-ltt'}`}>
                {inv.email}
              </p>
              <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                <RoleBadge role={inv.role} />
                <span className={`flex items-center gap-1 font-sora text-[11px] ${expired ? 'text-re' : 'text-lttm'}`}>
                  {expired
                    ? <><AlertTriangle size={9} /> Expirada {formatDate(inv.expires_at)}</>
                    : <><Clock size={9} /> Expira {formatDate(inv.expires_at)}</>}
                </span>
                {inv.resend_count > 0 && (
                  <span className="flex items-center gap-1 font-sora text-[11px] text-lttm">
                    <RefreshCw size={9} />
                    Reenviada {inv.resend_count}×
                    {inv.last_resent_at && <> · {formatDate(inv.last_resent_at)}</>}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Reenviar (activas y expiradas) */}
            {isAdmin && (
              <button
                onClick={() => handleResend(inv)}
                disabled={resendingId === inv.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ltb rounded-[7px] font-sora text-[11.5px] text-ltt2 hover:border-brand-cyan hover:text-brand-cyan transition-colors disabled:opacity-50"
                title="Reenviar y extender 7 días"
              >
                {resendingId === inv.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <RefreshCw size={12} />}
                Reenviar
              </button>
            )}

            {/* Copiar enlace */}
            <button
              onClick={() => onCopyLink(liveToken)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ltb rounded-[7px] font-sora text-[11.5px] text-ltt2 hover:border-brand-cyan hover:text-brand-cyan transition-colors"
            >
              {copiedToken === liveToken
                ? <><Check size={12} /> Copiado</>
                : <><Copy size={12} /> Copiar</>}
            </button>

            {/* Cancelar */}
            {isAdmin && (
              <button
                onClick={() => onCancel(inv.id)}
                className="p-1.5 text-lttm hover:bg-red-dim hover:text-re rounded-[6px] transition-colors"
                title="Cancelar invitación"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Mensaje personalizado */}
        {inv.message && (
          <div className="mt-2.5 ml-[52px] flex items-start gap-1.5 text-[11.5px] text-lttm font-sora">
            <MessageSquare size={11} className="mt-0.5 shrink-0" />
            <span className="italic">&quot;{inv.message}&quot;</span>
          </div>
        )}
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
          <Key size={14} className="text-lttm" />
          <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
            Invitaciones pendientes (0)
          </span>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="font-sora text-[13px] text-lttm">No hay invitaciones pendientes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {active.length > 0 && (
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
            <Key size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Pendientes ({active.length})
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {active.map((inv) => <InviteRow key={inv.id} inv={inv} />)}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden opacity-75">
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
            <AlertTriangle size={13} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Expiradas ({expired.length})
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {expired.map((inv) => <InviteRow key={inv.id} inv={inv} />)}
          </div>
        </div>
      )}
    </div>
  )
}
