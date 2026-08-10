import { useEffect, useRef } from 'react'

interface StreamingReasoningProps {
  text: string
}

export function StreamingReasoning({ text }: StreamingReasoningProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [text])

  return (
    <div
      ref={ref}
      className="max-h-[200px] overflow-y-auto font-sora text-[12.5px] text-ltt2 leading-relaxed whitespace-pre-wrap rounded-[8px] bg-ltcard2 border border-ltb p-3"
    >
      {text}
      <span className="inline-block w-[2px] h-[13px] bg-brand-cyan ml-0.5 animate-pulse-custom align-middle" />
    </div>
  )
}
