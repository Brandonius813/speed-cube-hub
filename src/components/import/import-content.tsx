"use client"

import { useCallback, useRef } from "react"
import { ImportChatMessages } from "@/components/import/import-chat-messages"
import {
  type ChatAction,
  TimerSelectAction,
  FileUploadAction,
  EventSelectAction,
  PreviewConfirmAction,
  ImportingAction,
  CompleteAction,
  ErrorAction,
} from "@/components/import/import-chat-actions"
import { useImportChat } from "@/components/import/use-import-chat"

export function ImportContent() {
  const {
    messages,
    isTyping,
    handleTimerSelect,
    handleData,
    handleEventConfirm,
    handleImport,
    handleToggleSolveIncluded,
    resetChat,
  } = useImportChat()

  const bottomRef = useRef<HTMLDivElement>(null)

  const renderAction = useCallback(
    (action: ChatAction) => {
      switch (action.type) {
        case "timer-select":
          return (
            <TimerSelectAction
              onSelect={handleTimerSelect}
              disabled={isTyping}
            />
          )
        case "file-upload":
          return <FileUploadAction onData={handleData} disabled={isTyping} />
        case "event-select":
          return (
            <EventSelectAction
              source={action.source}
              onConfirm={handleEventConfirm}
              disabled={isTyping}
            />
          )
        case "preview-confirm":
          return (
            <PreviewConfirmAction
              preview={action.preview}
              onImport={handleImport}
              onToggleSolveIncluded={handleToggleSolveIncluded}
              onStartOver={resetChat}
            />
          )
        case "importing":
          return <ImportingAction progress={action.progress} />
        case "complete":
          return (
            <CompleteAction
              hasRawSolves={action.hasRawSolves}
              onImportMore={resetChat}
            />
          )
        case "error":
          return (
            <ErrorAction message={action.message} onRetry={resetChat} />
          )
        default:
          return null
      }
    },
    [
      handleTimerSelect,
      handleData,
      handleEventConfirm,
      handleImport,
      handleToggleSolveIncluded,
      resetChat,
      isTyping,
    ]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Import Assistant</h1>
            <p className="text-xs text-muted-foreground">Import solves from your favorite timer app</p>
          </div>
        </div>
      </div>

      <ImportChatMessages
        messages={messages}
        isTyping={isTyping}
        renderAction={renderAction}
        bottomRef={bottomRef}
      />
    </div>
  )
}
