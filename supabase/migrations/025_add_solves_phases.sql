-- Migration 025: Persist multi-phase timer split durations on solves

ALTER TABLE solves
ADD COLUMN IF NOT EXISTS phases integer[];
