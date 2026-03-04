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
    resetChat,
  } = useImportChat()

  const bottomRef = useRef<HTMLDivElement>(null)

  const renderAction = useCallback(
    (action: ChatAction, _messageId: string) => {
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
              stats={action.stats}
              onImport={handleImport}
              onStartOver={resetChat}
            />
          )
        case "importing":
          return <ImportingAction progress={action.progress} />
        case "complete":
          return (
            <CompleteAction
              solveCount={action.solveCount}
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
      resetChat,
      isTyping,
    ]
  )

  return (
    <div className="flex h-full flex-col">
      <ImportChatMessages
        messages={messages}
        isTyping={isTyping}
        renderAction={renderAction}
        bottomRef={bottomRef}
      />
    </div>
  )
}
