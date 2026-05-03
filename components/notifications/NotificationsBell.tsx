'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Loader2, MessageSquare, User, Paperclip, Activity, AlertCircle } from 'lucide-react'
import {
  getMyNotificationsAction,
  getUnreadCountAction,
  markAsReadAction,
  markAllAsReadAction,
  type NotificationRow,
} from '@/app/(app)/notificaciones/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'shrink-0'
  if (type === 'mention')          return <MessageSquare size={13} className={`${cls} text-brand-cyan`} />
  if (type === 'task_assigned')    return <User          size={13} className={`${cls} text-gr`} />
  if (type === 'comment_added')    return <MessageSquare size={13} className={`${cls} text-lttm`} />
  if (type === 'attachment_added') return <Paperclip     size={13} className={`${cls} text-or`} />
  if (type === 'status_changed')   return <Activity      size={13} className={`${cls} text-brand-cyan`} />
  return <AlertCircle size={13} className={`${cls} text-lttm`} />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function NotificationsBell() {
  const [open,         setOpen]         = useState(false)
  const [unreadCount,  setUnreadCount]  = useState(0)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading,      setLoading]      = useState(false)
  const [markingAll,   setMarkingAll]   = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Poll unread count every 30s
  const loadCount = useCallback(async () => {
    const count = await getUnreadCountAction()
    setUnreadCount(count)
  }, [])

  useEffect(() => {
    void loadCount()
    const interval = setInterval(loadCount, 30_000)
    return () => clearInterval(interval)
  }, [loadCount])

  async function openDropdown() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    const res = await getMyNotificationsAction({ limit: 10 })
    if ('notifications' in res) setNotifications(res.notifications)
    setLoading(false)
  }

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarkRead(id: string) {
    await markAsReadAction(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    await markAllAsReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnreadCount(0)
    setMarkingAll(false)
  }

  async function handleClickNotif(notif: NotificationRow) {
    if (!notif.read_at) await handleMarkRead(notif.id)
    if (notif.link_url) router.push(notif.link_url)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={openDropdown}
        className="relative flex items-center justify-center w-8 h-8 rounded-[8px] text-dktm hover:text-dkt hover:bg-dk7 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-re text-white font-plex text-[9px] font-bold rounded-full px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-ltcard border border-ltb rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ltb bg-ltcard2">
            <span className="font-sora text-[13px] font-semibold text-ltt">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 bg-re text-white font-plex text-[9px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 font-sora text-[11px] text-brand-cyan hover:underline disabled:opacity-60"
              >
                {markingAll
                  ? <Loader2 size={10} className="animate-spin" />
                  : <CheckCheck size={11} />
                }
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-ltb">
            {loading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 size={16} className="text-brand-cyan animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Bell size={20} className="text-lttm opacity-40" />
                <p className="font-sora text-[12px] text-lttm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClickNotif(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ltbg ${
                    !notif.read_at ? 'bg-cyan-dim/30' : ''
                  }`}
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-sora text-[12.5px] leading-snug ${!notif.read_at ? 'text-ltt font-medium' : 'text-ltt2'}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="font-sora text-[11px] text-lttm mt-0.5 truncate">{notif.body}</p>
                    )}
                    <p className="font-plex text-[10px] text-lttm mt-1">{formatRelTime(notif.created_at)}</p>
                  </div>
                  {!notif.read_at && (
                    <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-ltb bg-ltcard2">
            <button
              onClick={() => { router.push('/notificaciones'); setOpen(false) }}
              className="w-full font-sora text-[12px] text-brand-cyan hover:underline text-center"
            >
              Ver todas las notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
