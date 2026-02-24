"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Check } from "lucide-react";
import { WCA_EVENTS, getPracticeTypesForEvent } from "@/lib/constants";
import { createSession } from "@/lib/actions/sessions";
import { parseDuration, parseSolveTime } from "@/lib/utils";

const CUSTOM_VALUE = "__custom__";

/** Practice types where number of solves and times are the main focus */
const SOLVE_BASED_TYPES = ["Solves", "Slow Solves", "Comp Sim"];

function isSolveBased(practiceType: string): boolean {
  return SOLVE_BASED_TYPES.includes(practiceType);
}

export function SessionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState("333");
  const [practiceType, setPracticeType] = useState("Solves");
  const [customType, setCustomType] = useState("");

  const practiceTypes = useMemo(() => getPracticeTypesForEvent(event), [event]);

  // Determine the resolved practice type for dynamic field display
  const resolvedType = practiceType === CUSTOM_VALUE ? customType.trim() : practiceType;
  const solveBased = isSolveBased(resolvedType);

  function handleEventChange(newEvent: string) {
    setEvent(newEvent);
    // Reset practice type to "Solves" when changing events,
    // since the old selection might not exist for the new event
    setPracticeType("Solves");
    setCustomType("");
  }

  function handlePracticeTypeChange(value: string) {
    setPracticeType(value);
    if (value !== CUSTOM_VALUE) {
      setCustomType("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const sessionDate = formData.get("date") as string;
    const solvesRaw = (formData.get("solves") as string)?.trim();
    const numSolves = solvesRaw ? parseInt(solvesRaw, 10) : null;
    const durationMinutes = parseDuration(formData.get("time") as string);
    const avgTimeStr = (formData.get("avg") as string)?.trim();
    const bestTimeStr = (formData.get("best") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    // Resolve the final practice type — either the dropdown selection or the custom text
    const finalPracticeType =
      practiceType === CUSTOM_VALUE ? customType.trim() : practiceType;

    const solvesRequired = isSolveBased(finalPracticeType);

    if (!sessionDate || !event || !finalPracticeType || !durationMinutes) {
      setError(
        !durationMinutes && (formData.get("time") as string)?.trim()
          ? 'Invalid time format. Use minutes (e.g. "90") or h:mm (e.g. "1:30").'
          : "Please fill in all required fields."
      );
      setLoading(false);
      return;
    }

    if (solvesRequired && !numSolves) {
      setError("Number of solves is required for this practice type.");
      setLoading(false);
      return;
    }

    const result = await createSession({
      session_date: sessionDate,
      event,
      practice_type: finalPracticeType,
      num_solves: numSolves,
      duration_minutes: durationMinutes,
      avg_time: avgTimeStr ? parseSolveTime(avgTimeStr) : null,
      best_time: bestTimeStr ? parseSolveTime(bestTimeStr) : null,
      title: title || null,
      notes: notes || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
    form.reset();
    setEvent("333");
    setPracticeType("Solves");
    setCustomType("");
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" />
          Log Practice Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" className="text-foreground">
                Date
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
                className="min-h-11 border-border bg-secondary/50 text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Event</Label>
              <Select value={event} onValueChange={handleEventChange}>
                <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50 text-foreground">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {WCA_EVENTS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Practice Type</Label>
              <Select value={practiceType} onValueChange={handlePracticeTypeChange}>
                <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50 text-foreground">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {practiceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VALUE}>Custom...</SelectItem>
                </SelectContent>
              </Select>
              {practiceType === CUSTOM_VALUE && (
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Enter custom practice type"
                  className="min-h-11 border-border bg-secondary/50 text-foreground"
                  autoFocus
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="solves" className="text-foreground">
                Number of Solves
                {!solveBased && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                )}
              </Label>
              <Input
                id="solves"
                name="solves"
                type="number"
                placeholder={solveBased ? "50" : "0"}
                min={0}
                required={solveBased}
                className="min-h-11 border-border bg-secondary/50 text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="time" className="text-foreground">
                Practice Duration (min)
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (e.g. 1:30 or 90)
                </span>
              </Label>
              <Input
                id="time"
                name="time"
                type="text"
                inputMode="numeric"
                placeholder="1:30 or 90"
                required
                className="min-h-11 border-border bg-secondary/50 text-foreground"
              />
            </div>

            {solveBased && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="avg" className="text-foreground">
                    Result Average
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (optional, e.g. 12.34 or 1:30.00)
                    </span>
                  </Label>
                  <Input
                    id="avg"
                    name="avg"
                    type="text"
                    placeholder="12.34 or 1:30.00"
                    className="min-h-11 border-border bg-secondary/50 font-mono text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="best" className="text-foreground">
                    Best Single
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (optional, e.g. 10.52 or 1:05.00)
                    </span>
                  </Label>
                  <Input
                    id="best"
                    name="best"
                    type="text"
                    placeholder="10.52 or 1:05.00"
                    className="min-h-11 border-border bg-secondary/50 font-mono text-foreground"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-foreground">
              Title
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional — shown as a headline in the feed)
              </span>
            </Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder='e.g. "Finally sub-15!" or "Comp prep grind"'
              maxLength={100}
              className="min-h-11 border-border bg-secondary/50 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes" className="text-foreground">
              Description
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional — tell your followers how it went)
              </span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="How did the session go? Any PBs, breakthroughs, or things to work on?"
              rows={3}
              className="border-border bg-secondary/50 text-foreground"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:self-end"
            disabled={loading || submitted}
          >
            {submitted ? (
              <>
                <Check className="h-4 w-4" />
                Session Logged
              </>
            ) : loading ? (
              "Saving..."
            ) : (
              "Log Session"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
