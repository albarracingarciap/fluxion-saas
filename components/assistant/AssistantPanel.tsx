'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { AssistantToggle } from './AssistantToggle'
import { AssistantHeader } from './AssistantHeader'
import { MessageBubble, type Message } from './MessageBubble'
import { AssistantInput } from './AssistantInput'
import { SuggestionChips } from './SuggestionChips'

export function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const pathname = usePathname()
  const params = useParams()
  const systemId = typeof params?.id === 'string' ? params.id : undefined

  // Scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Abortar stream al desmontar
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setConvId(null)
    setIsStreaming(false)
    setStreamingMsgId(null)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming || !text.trim()) return

    setInput('')
    setIsStreaming(true)

    const userMsgId = crypto.randomUUID()
    const assistantMsgId = crypto.randomUUID()

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ])
    setStreamingMsgId(assistantMsgId)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/agent/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: convId,
          context_page: pathname ?? '/',
          context_system_id: systemId ?? null,
          history: messages.slice(-18).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue

          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          if ('delta' in event && typeof event.delta === 'string') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.delta }
                  : m
              )
            )
          } else if (event.type === 'complete') {
            if (typeof event.conversation_id === 'string') {
              setConvId(event.conversation_id)
            }
            setIsStreaming(false)
            setStreamingMsgId(null)
          } else if (event.type === 'error') {
            throw new Error(typeof event.message === 'string' ? event.message : 'Error del agente')
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return

      const errorText = err instanceof Error ? err.message : 'Error de red.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `_Error: ${errorText}_` }
            : m
        )
      )
      setIsStreaming(false)
      setStreamingMsgId(null)
    }
  }, [isStreaming, convId, pathname, systemId, messages])

  return (
    <>
      {!isOpen && (
        <AssistantToggle onClick={() => setIsOpen(true)} />
      )}

      {isOpen && (
        <div
          className="fixed bottom-0 right-0 z-[80] flex flex-col bg-ltbg border-l border-t border-ltb shadow-[−4px_0_30px_rgba(0,0,0,0.12)] animate-fadein print:hidden"
          style={{ width: 380, height: '100vh', maxHeight: '100vh' }}
        >
          {/* Cabecera zona oscura */}
          <AssistantHeader
            onClose={() => setIsOpen(false)}
            onNewConversation={handleNewConversation}
          />

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <SuggestionChips
                pathname={pathname ?? '/'}
                onSelect={(s) => sendMessage(s)}
              />
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === streamingMsgId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input zona clara */}
          <AssistantInput
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage(input)}
            disabled={isStreaming}
          />
        </div>
      )}
    </>
  )
}
