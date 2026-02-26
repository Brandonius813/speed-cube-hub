import { ChevronUp, ChevronDown, Plus, X } from "lucide-react"
import { CubingIcon } from "@/components/shared/cubing-icon"

export function EventOrderTab({
  mainEvents,
  maxMainEvents,
  mainLimitReached,
  orderedOtherEvents,
  unorderedEvents,
  getEventLabel,
  onAddToMain,
  onRemoveFromMain,
  onMoveMainUp,
  onMoveMainDown,
  onAddToOther,
  onRemoveFromOther,
  onMoveOtherUp,
  onMoveOtherDown,
}: {
  mainEvents: string[]
  maxMainEvents: number
  mainLimitReached: boolean
  orderedOtherEvents: string[]
  unorderedEvents: { id: string; label: string }[]
  getEventLabel: (id: string) => string
  onAddToMain: (id: string) => void
  onRemoveFromMain: (id: string) => void
  onMoveMainUp: (index: number) => void
  onMoveMainDown: (index: number) => void
  onAddToOther: (id: string) => void
  onRemoveFromOther: (id: string) => void
  onMoveOtherUp: (index: number) => void
  onMoveOtherDown: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Main Events */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Events ({mainEvents.length}/{maxMainEvents})
          </p>
          {mainLimitReached && (
            <p className="text-[10px] text-muted-foreground/60">
              Maximum {maxMainEvents} main events
            </p>
          )}
        </div>
        {mainEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 px-1 py-3">
            No main events yet. Add events below to pin them to the top of your
            PBs page.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {mainEvents.map((eventId, index) => (
              <div
                key={eventId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-secondary/40 min-h-11"
              >
                <CubingIcon
                  event={eventId}
                  className="text-sm text-muted-foreground shrink-0"
                />
                <span className="text-sm font-medium text-foreground flex-1 min-w-0">
                  {getEventLabel(eventId)}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onMoveMainUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onMoveMainDown(index)}
                    disabled={index === mainEvents.length - 1}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemoveFromMain(eventId)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove from main events"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ordered Other Events */}
      {orderedOtherEvents.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Other Events (ordered)
          </p>
          <div className="flex flex-col gap-0.5">
            {orderedOtherEvents.map((eventId, index) => (
              <div
                key={eventId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-secondary/20 min-h-11"
              >
                <CubingIcon
                  event={eventId}
                  className="text-sm text-muted-foreground shrink-0"
                />
                <span className="text-sm text-foreground flex-1 min-w-0">
                  {getEventLabel(eventId)}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onMoveOtherUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onMoveOtherDown(index)}
                    disabled={index === orderedOtherEvents.length - 1}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemoveFromOther(eventId)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove custom order"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unordered Events (available to add) */}
      {unorderedEvents.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            All Events
          </p>
          <div className="flex flex-col gap-0.5">
            {unorderedEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/40 min-h-11 transition"
              >
                <CubingIcon
                  event={event.id}
                  className="text-sm text-muted-foreground shrink-0"
                />
                <span className="text-sm text-muted-foreground flex-1 min-w-0">
                  {event.label}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onAddToMain(event.id)}
                    disabled={mainLimitReached}
                    className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    title={mainLimitReached ? "Main events full" : "Add to main events"}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onAddToOther(event.id)}
                    className="rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Add to ordered list"
                  >
                    Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
