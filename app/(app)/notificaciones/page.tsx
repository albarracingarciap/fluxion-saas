'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, CheckCheck, Loader2, MessageSquare, User,
  Paperclip, Activity, AlertCircle, ChevronRight,
} from 'lucide-react'
import {
  getMyNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
  type NotificationRow,
} from './actions'

const PAGE_SIZE = 25

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'mention')          return <MessageSquare size={15} className="text-brand-cyan shrink-0" />
  if (type === 'task_assigned')    return <User          size={15} className="text-gr shrink-0" />
  if (type === 'comment_added')    return <MessageSquare size={15} className="text-lttm shrink-0" />
  if (type === 'attachment_added') return <Paperclip     size={15} className="text-or shrink-0" />
  if (type === 'status_changed')   return <Activity      size={15} className="text-brand-cyan shrink-0" />
  return <AlertCircle size={15} className="text-lttm shrink-0" />
}

type Filter = 'all' | 'unread'

export default function NotificacionesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<Filter>('all')
  const [offset,        setOffset]        = useState(0)
  const [markingAll,    setMarkingAll]    = useState(false)

  const load = useCallback(async (newOffset = 0, currentFilter = filter) => {
    setLoading(true)
    const res = await getMyNotificationsAction({
      unreadOnly: currentFilter === 'unread',
      limit:      PAGE_SIZE,
      offset:     newOffset,
    })
    if ('notifications' in res) {
      setNotifications(res.notifications)
      setTotal(res.total)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    setOffset(0)
    void load(0, filter)
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkRead(id: string) {
    await markAsReadAction(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    await markAllAsReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setMarkingAll(false)
  }

  function handleClick(notif: NotificationRow) {
    if (!notif.read_at) void handleMarkRead(notif.id)
    if (notif.link_url) router.push(notif.link_url)
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div className="max-w-[800px] w-full mx-auto animate-fadein pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-plex text-lttm uppercase tracking-wider mb-4">
        <Bell size={13} className="text-lttm" />
        <span>Notificaciones</span>
        <ChevronRight size={11} className="text-lttm" />
        <span className="text-ltt">Todas</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1">Notificaciones</h1>
          <p className="font-sora text-[13px] text-ltt2">{total} notificaciones en total</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-ltt2 hover:bg-ltbg transition-colors disabled:opacity-60"
          >
            {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-ltb">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 font-sora text-[13px] border-b-2 transition-colors ${
              filter === f
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-lttm hover:text-ltt'
            }`}
          >
            {f === 'all' ? 'Todas' : 'No leídas'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="text-brand-cyan animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Bell size={28} className="text-lttm opacity-30" />
            <p className="font-sora text-[13px] text-lttm">
              {filter === 'unread' ? 'No tienes notificaciones pendientes' : 'Sin notificaciones aún'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ltb">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-ltbg ${
                  !notif.read_at ? 'bg-cyan-dim/20' : ''
                }`}
                onClick={() => handleClick(notif)}
              >
                {/* Icon */}
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  !notif.read_at ? 'bg-cyan-dim' : 'bg-ltbg'
                }`}>
                  <NotifIcon type={notif.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-sora text-[13.5px] leading-snug ${!notif.read_at ? 'font-medium text-ltt' : 'text-ltt2'}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="font-sora text-[12px] text-lttm mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <p className="font-plex text-[10.5px] text-lttm mt-1.5">{formatDateTime(notif.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!notif.read_at && (
                  <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="font-sora text-[12px] text-lttm">
            Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newOffset = Math.max(0, offset - PAGE_SIZE)
                setOffset(newOffset)
                void load(newOffset)
              }}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[12px] text-lttm hover:bg-ltbg disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => {
                const newOffset = offset + PAGE_SIZE
                setOffset(newOffset)
                void load(newOffset)
              }}
              disabled={offset + PAGE_SIZE >= total || loading}
              className="px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[12px] text-lttm hover:bg-ltbg disabled:opacity-40 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
