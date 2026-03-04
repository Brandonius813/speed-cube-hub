"use client"

import { useEffect, useRef, type RefObject } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage, ChatAction } from "@/components/import/import-chat-actions"

type Props = {
  messages: ChatMessage[]
  isTyping: boolean
  renderAction: (action: ChatAction, messageId: string) => React.ReactNode
  bottomRef: RefObject<HTMLDivElement | null>
}

/** Render markdown-like bold (**text**) and newlines. */
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    // Split on newlines
    const lines = part.split("\n")
    return lines.map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ))
  })
}

function TypingIndicator() {
  return (
    <div className="flex max-w-[85%] sm:max-w-[70%]">
      <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-card px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  renderAction,
}: {
  message: ChatMessage
  renderAction: Props["renderAction"]
}) {
  const isBot = message.role === "bot"

  return (
    <div className={cn("flex", isBot ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[70%]",
          isBot ? "space-y-3" : ""
        )}
      >
        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isBot
                ? "rounded-tl-sm border border-border/50 bg-card text-muted-foreground"
                : "rounded-tr-sm border border-primary/20 bg-primary/10 text-foreground"
            )}
          >
            {renderContent(message.content)}
          </div>
        )}

        {/* Action widget below the text */}
        {message.action && renderAction(message.action, message.id)}
      </div>
    </div>
  )
}

export function ImportChatMessages({
  messages,
  isTyping,
  renderAction,
  bottomRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when messages change or typing starts
  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 50)
    return () => clearTimeout(timeout)
  }, [messages.length, isTyping, bottomRef])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-2 sm:px-4">
      <div className="mx-auto max-w-2xl space-y-3 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            renderAction={renderAction}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
