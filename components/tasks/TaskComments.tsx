'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Send, Loader2, Pencil, Trash2, X, Check, AtSign } from 'lucide-react'
import {
  getCommentsAction,
  addCommentAction,
  updateCommentAction,
  deleteCommentAction,
  type CommentRow,
} from '@/app/(app)/tareas/actions'
import type { Member } from './CreateTaskModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'justo ahora'
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function Avatar({ name, avatar, size = 28 }: { name?: string | null; avatar?: string | null; size?: number }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (avatar) {
    return (
      <div
        className="shrink-0 rounded-full overflow-hidden border border-ltb bg-ltbg"
        style={{ width: size, height: size }}
      >
        <Image src={avatar} alt={name ?? ''} width={size} height={size} className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div
      className="shrink-0 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-white font-sora font-bold border border-ltb"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

// ── Mention picker ────────────────────────────────────────────────────────────

type MentionState = {
  active:   boolean
  query:    string
  startIdx: number
}

function MentionDropdown({
  members,
  query,
  onSelect,
}: {
  members: Member[]
  query:   string
  onSelect: (member: Member) => void
}) {
  const filtered = members.filter((m) => {
    const name = (m.full_name ?? m.email ?? '').toLowerCase()
    return name.includes(query.toLowerCase())
  }).slice(0, 6)

  if (filtered.length === 0) return null

  return (
    <div className="absolute z-50 bottom-full left-0 mb-1 w-64 bg-ltcard border border-ltb rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden">
      {filtered.map((m) => (
        <button
          key={m.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(m) }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ltbg text-left transition-colors"
        >
          <Avatar name={m.full_name} size={24} />
          <div className="min-w-0">
            <p className="font-sora text-[12.5px] text-ltt truncate">{m.full_name ?? m.email}</p>
            {m.full_name && m.email && (
              <p className="font-plex text-[10px] text-lttm truncate">{m.email}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Comment editor ────────────────────────────────────────────────────────────

function CommentEditor({
  members,
  placeholder,
  initialBody,
  initialMentions,
  onSubmit,
  onCancel,
  loading,
}: {
  members:         Member[]
  placeholder?:    string
  initialBody?:    string
  initialMentions?: string[]
  onSubmit:        (body: string, mentions: string[]) => void
  onCancel?:       () => void
  loading:         boolean
}) {
  const [body,     setBody]     = useState(initialBody ?? '')
  const [mentions, setMentions] = useState<string[]>(initialMentions ?? [])
  const [mention,  setMention]  = useState<MentionState>({ active: false, query: '', startIdx: -1 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && mention.active) {
      setMention({ active: false, query: '', startIdx: -1 })
      return
    }
    if ((e.key === 'Enter') && !e.shiftKey && !mention.active) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setBody(val)

    const cursor = e.target.selectionStart ?? val.length
    // Detectar @ para mention picker
    const textBefore = val.slice(0, cursor)
    const match      = textBefore.match(/@(\w*)$/)
    if (match) {
      setMention({ active: true, query: match[1] ?? '', startIdx: cursor - (match[0]?.length ?? 0) })
    } else {
      setMention({ active: false, query: '', startIdx: -1 })
    }
  }

  function handleMentionSelect(member: Member) {
    if (!textareaRef.current) return
    const cursor   = textareaRef.current.selectionStart ?? body.length
    const before   = body.slice(0, mention.startIdx)
    const after    = body.slice(cursor)
    const name     = member.full_name ?? member.email ?? member.id
    const newBody  = `${before}@${name} ${after}`
    setBody(newBody)
    setMentions((prev) => Array.from(new Set([...prev, member.id])))
    setMention({ active: false, query: '', startIdx: -1 })
    // Reposicionar cursor
    setTimeout(() => {
      if (!textareaRef.current) return
      const pos = before.length + name.length + 2
      textareaRef.current.setSelectionRange(pos, pos)
      textareaRef.current.focus()
    }, 0)
  }

  function handleSubmit() {
    if (!body.trim() || loading) return
    onSubmit(body.trim(), mentions)
    if (!initialBody) {
      setBody('')
      setMentions([])
    }
  }

  return (
    <div className="relative">
      {mention.active && (
        <MentionDropdown
          members={members}
          query={mention.query}
          onSelect={handleMentionSelect}
        />
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Escribe un comentario… (@ para mencionar, Enter para enviar)'}
          rows={2}
          className="flex-1 bg-ltbg border border-ltb rounded-[9px] px-3 py-2.5 text-[13px] text-ltt font-sora outline-none resize-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10"
        />
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!body.trim() || loading}
            className="p-2 bg-brand-cyan text-white rounded-[8px] hover:bg-brand-cyan/90 transition-colors disabled:opacity-40"
            title="Enviar (Enter)"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 border border-ltb rounded-[8px] text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 font-sora text-[10px] text-lttm flex items-center gap-1">
        <AtSign size={9} /> para mencionar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}

// ── Comment item ──────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentProfileId,
  members,
  onUpdated,
  onDeleted,
}: {
  comment:          CommentRow
  currentProfileId: string
  members:          Member[]
  onUpdated:        (id: string, body: string) => void
  onDeleted:        (id: string) => void
}) {
  const [editing,    setEditing]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const isAuthor = comment.author_id === currentProfileId

  async function handleEdit(body: string) {
    setLoading(true)
    const res = await updateCommentAction(comment.id, body)
    setLoading(false)
    if ('ok' in res) {
      onUpdated(comment.id, body)
      setEditing(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteCommentAction(comment.id)
    setLoading(false)
    if ('ok' in res) onDeleted(comment.id)
  }

  // Resaltar menciones en el cuerpo
  function renderBody(text: string) {
    return text.split(/(@\S+)/g).map((part, i) =>
      part.startsWith('@')
        ? <span key={i} className="text-brand-cyan font-medium">{part}</span>
        : <span key={i}>{part}</span>
    )
  }

  return (
    <div className="flex gap-3 group">
      <Avatar name={comment.author_name} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-sora text-[12.5px] font-semibold text-ltt">
            {comment.author_name ?? comment.author_email ?? 'Usuario'}
          </span>
          <span className="font-sora text-[11px] text-lttm">{formatRelTime(comment.created_at)}</span>
          {comment.edited_at && (
            <span className="font-sora text-[10px] text-lttm italic">(editado)</span>
          )}
        </div>

        {editing ? (
          <CommentEditor
            members={members}
            initialBody={comment.body}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            loading={loading}
          />
        ) : (
          <p className="font-sora text-[13px] text-ltt2 leading-relaxed whitespace-pre-wrap break-words">
            {renderBody(comment.body)}
          </p>
        )}

        {/* Actions (visible on hover) */}
        {isAuthor && !editing && (
          <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {confirmDel ? (
              <>
                <span className="font-sora text-[11px] text-re">¿Eliminar?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="font-sora text-[11px] text-re hover:underline"
                >
                  {loading ? <Loader2 size={10} className="animate-spin inline" /> : 'Sí'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="font-sora text-[11px] text-lttm hover:text-ltt"
                >
                  No
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 text-lttm hover:text-ltt rounded transition-colors"
                  title="Editar"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => setConfirmDel(true)}
                  className="p-1 text-lttm hover:text-re rounded transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Props = {
  taskId:           string
  members:          Member[]
  currentProfileId: string
}

export function TaskComments({ taskId, members, currentProfileId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const data = await getCommentsAction(taskId)
    setComments(data)
    setLoading(false)
  }, [taskId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function handleAdd(body: string, mentions: string[]) {
    setSending(true)
    const res = await addCommentAction(taskId, body, mentions)
    setSending(false)
    if ('id' in res) void load()
  }

  function handleUpdated(id: string, body: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, body, edited_at: new Date().toISOString() } : c))
  }

  function handleDeleted(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 size={16} className="text-brand-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-center font-sora text-[12.5px] text-lttm py-4 italic">
          Sin comentarios aún. Sé el primero.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentProfileId={currentProfileId}
              members={members}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="pt-3 border-t border-ltb">
        <CommentEditor
          members={members}
          onSubmit={handleAdd}
          loading={sending}
        />
      </div>
    </div>
  )
}
