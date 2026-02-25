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
  num_solves: z.number().int().min(0).max(10000).nullable(),
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
  num_solves: z.number().int().min(0).max(10000).nullable(),
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
