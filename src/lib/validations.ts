import { z, type ZodError } from "zod"
import {
  WCA_EVENTS,
  getPracticeTypesForEvent,
  getPBTypesForEvent,
} from "@/lib/constants"

/** Extract the first human-readable error message from a ZodError. */
export function zodFirstError(err: ZodError): string {
  const issue = err.issues[0]
  if (issue.path.length > 0) {
    return `${issue.path.join(".")}: ${issue.message}`
  }
  return issue.message
}

// --- Valid value sets derived from constants ---

const validEventIds = new Set<string>(WCA_EVENTS.map((e) => e.id))

const validPracticeTypes = new Set<string>()
for (const event of WCA_EVENTS) {
  for (const pt of getPracticeTypesForEvent(event.id)) {
    validPracticeTypes.add(pt)
  }
}

const validPBTypes = new Set<string>()
for (const event of WCA_EVENTS) {
  for (const pt of getPBTypesForEvent(event.id)) {
    validPBTypes.add(pt)
  }
}

// --- Reusable field schemas ---

const eventField = z
  .string()
  .refine((v) => validEventIds.has(v), { message: "Invalid event" })

const practiceTypeField = z
  .string()
  .min(1, "Practice type is required")
  .max(100, "Practice type is too long")

const pbTypeField = z
  .string()
  .refine((v) => validPBTypes.has(v), { message: "Invalid PB type" })

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
  .refine((d) => !isNaN(Date.parse(d)), "Invalid date")
  .refine((d) => d <= new Date().toISOString().split("T")[0], "Date cannot be in the future")

// --- Session schemas ---

export const createSessionSchema = z.object({
  session_date: dateField,
  event: eventField,
  practice_type: practiceTypeField,
  num_solves: z.number().int().min(0).max(10000).nullable().default(0),
  num_dnf: z.number().int().min(0).max(10000).nullable().default(0),
  duration_minutes: z.number().int().min(1).max(1440),
  avg_time: z.number().positive().max(3600).nullable(),
  best_time: z.number().positive().max(3600).nullable(),
  title: z.string().max(200).nullable(),
  notes: z.string().max(2000).nullable(),
})

export const bulkSessionItemSchema = z.object({
  session_date: dateField,
  event: eventField,
  practice_type: practiceTypeField,
  num_solves: z.number().int().min(0).max(10000).nullable().default(0),
  num_dnf: z.number().int().min(0).max(10000).nullable().default(0),
  duration_minutes: z.number().int().min(1).max(1440),
  avg_time: z.number().positive().max(3600).nullable(),
  best_time: z.number().positive().max(3600).nullable(),
  notes: z.string().max(2000).nullable(),
})

// --- PB schemas ---

export const logPBSchema = z.object({
  event: eventField,
  pb_type: pbTypeField,
  time_seconds: z.number().positive().max(3600),
  date_achieved: dateField,
  notes: z.string().max(2000).optional(),
  mbld_solved: z.number().int().min(1).optional(),
  mbld_attempted: z.number().int().min(2).optional(),
})

export const bulkPBItemSchema = z.object({
  event: eventField,
  pb_type: pbTypeField,
  time_seconds: z.number().positive().max(3600),
  date_achieved: dateField,
  mbld_solved: z.number().int().min(1).optional(),
  mbld_attempted: z.number().int().min(2).optional(),
})

export const updatePBSchema = z.object({
  time_seconds: z.number().positive().max(3600),
  date_achieved: dateField,
  notes: z.string().max(2000).optional(),
  mbld_solved: z.number().int().min(1).optional(),
  mbld_attempted: z.number().int().min(2).optional(),
})

// --- Timer schemas ---

const validPenalties = ["+2", "DNF"] as const
const paneTools = ["scramble_text", "draw", "cross", "time_distribution", "time_trend"] as const
const paneSlots = ["top", "left", "right", "bottom"] as const

export const createTimerSessionSchema = z.object({
  event: eventField,
  mode: z.enum(["normal", "comp_sim"]).default("normal"),
})

export const addSolveSchema = z.object({
  solve_number: z.number().int().min(1).max(10000),
  time_ms: z.number().int().min(0).max(3600000),
  penalty: z.enum(validPenalties).nullable(),
  scramble: z.string().max(1000),
  event: eventField,
  comp_sim_group: z.number().int().min(1).nullable(),
})

export const updateSolveSchema = z.object({
  penalty: z.enum(validPenalties).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// --- Timer pane layout schemas ---

export const timerPaneToolSchema = z.enum(paneTools)
export const timerPaneSlotSchema = z.enum(paneSlots)

export const timerPaneRectSchema = z.object({
  x: z.number().int().min(0).max(23),
  y: z.number().int().min(0).max(99),
  w: z.number().int().min(1).max(24),
  h: z.number().int().min(1).max(99),
})

export const timerPaneInstanceSchema = z.object({
  id: z.string().uuid(),
  tool: timerPaneToolSchema,
  rect: timerPaneRectSchema,
  slot: timerPaneSlotSchema.optional(),
  options: z
    .object({
      scope: z.enum(["session", "all"]).optional(),
    })
    .optional(),
})

export const timerPaneLayoutSchema = z.object({
  version: z.literal(1),
  updatedAtMs: z.number().int().min(0),
  autoHideDuringSolve: z.boolean(),
  desktop: z.object({
    cols: z.union([z.literal(12), z.literal(24)]),
    rowHeight: z.literal(36),
    gap: z.literal(8),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    panes: z.array(timerPaneInstanceSchema).max(4, "Maximum 4 panes"),
  }),
  mobile: z.object({
    order: z.array(z.string().uuid()),
    heights: z.record(z.string(), z.enum(["sm", "md", "lg"])),
  }),
}).superRefine((layout, ctx) => {
  const seenTools = new Set<string>()
  const seenSlots = new Set<string>()
  for (const pane of layout.desktop.panes) {
    if (seenTools.has(pane.tool)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate pane tool: ${pane.tool}`,
      })
    } else {
      seenTools.add(pane.tool)
    }
    if (pane.slot) {
      if (seenSlots.has(pane.slot)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate pane slot: ${pane.slot}`,
        })
      } else {
        seenSlots.add(pane.slot)
      }
    }
    if (pane.rect.x + pane.rect.w > layout.desktop.cols) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Pane ${pane.id} exceeds desktop grid width`,
      })
    }
  }
})

export const upsertTimerPaneLayoutSchema = z.object({
  layout: timerPaneLayoutSchema,
  layoutKey: z.string().trim().min(1).max(50).default("main"),
})

// --- Goal schemas ---

export const createGoalSchema = z.object({
  event: eventField,
  target_avg: z.number().positive().max(3600),
  target_date: dateField,
})

export const updateGoalSchema = z.object({
  event: eventField.optional(),
  target_avg: z.number().positive().max(3600).optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
})

// --- Solve Session schemas ---

export const createSolveSessionSchema = z.object({
  name: z.string().trim().min(1, "Session name is required").max(100, "Session name must be 100 characters or less"),
  event: eventField,
  is_tracked: z.boolean().default(true),
})

export const updateSolveSessionSchema = z.object({
  name: z.string().trim().min(1, "Session name is required").max(100, "Session name must be 100 characters or less").optional(),
  is_tracked: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

// --- Club schemas ---

export const createClubSchema = z.object({
  name: z.string().trim().min(1, "Club name is required").max(100, "Club name must be 100 characters or less"),
  description: z.string().max(500).optional(),
})

export const updateClubSchema = z.object({
  name: z.string().trim().min(1, "Club name is required").max(100, "Club name must be 100 characters or less").optional(),
  description: z.string().max(500).optional(),
})
