'use client'

import { Bot, User } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

// Renderizado ligero de markdown: negrita, inline code, listas, párrafos
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="flex flex-col gap-0.5 my-1 pl-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 font-sora text-[12.5px] text-ltt2 leading-relaxed">
              <span className="mt-[5px] w-1 h-1 rounded-full bg-lttm shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
      continue
    }

    flushList()

    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <p key={key++} className="font-sora text-[12px] font-semibold text-ltt mt-1">
          {renderInline(line.slice(4))}
        </p>
      )
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <p key={key++} className="font-sora text-[12.5px] font-semibold text-ltt mt-1">
          {renderInline(line.slice(3))}
        </p>
      )
      continue
    }

    elements.push(
      <p key={key++} className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
        {renderInline(line)}
      </p>
    )
  }

  flushList()
  return elements
}

function renderInline(text: string): React.ReactNode[] {
  // Handles **bold**, `code`, and plain text
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    const raw = match[0]
    if (raw.startsWith('**')) {
      parts.push(<strong key={match.index} className="font-semibold text-ltt">{raw.slice(2, -2)}</strong>)
    } else {
      parts.push(
        <code key={match.index} className="font-plex text-[11px] bg-ltb text-ltt2 px-1 py-0.5 rounded-[4px]">
          {raw.slice(1, -1)}
        </code>
      )
    }
    last = match.index + raw.length
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return parts
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[85%] bg-[var(--cyan-dim2)] border border-[var(--cyan-border)] rounded-[10px] rounded-br-[3px] px-3.5 py-2.5">
          <p className="font-sora text-[12.5px] text-ltt leading-relaxed">
            {message.content}
          </p>
        </div>
        <div className="w-[24px] h-[24px] rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center shrink-0 mb-0.5">
          <User size={12} className="text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-[24px] h-[24px] rounded-full bg-dk7 border border-dkb flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={12} className="text-brand-cyan" />
      </div>
      <div className="max-w-[90%] bg-ltcard2 border border-ltb rounded-[10px] rounded-tl-[3px] px-3.5 py-2.5">
        {message.content
          ? renderMarkdown(message.content)
          : isStreaming && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-lttm animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-lttm animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-lttm animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )
        }
        {isStreaming && message.content && (
          <span className="inline-block w-[2px] h-[13px] bg-brand-cyan ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
