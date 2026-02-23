"use client";

import { useState } from "react";
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
import { WCA_EVENTS, PRACTICE_TYPES } from "@/lib/constants";
import { createSession } from "@/lib/actions/sessions";

export function SessionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState("333");
  const [practiceType, setPracticeType] = useState("Solves");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const sessionDate = formData.get("date") as string;
    const numSolves = parseInt(formData.get("solves") as string, 10);
    const durationMinutes = parseInt(formData.get("time") as string, 10);
    const avgTimeStr = (formData.get("avg") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    if (!sessionDate || !event || !practiceType || !numSolves || !durationMinutes) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    const result = await createSession({
      session_date: sessionDate,
      event,
      practice_type: practiceType,
      num_solves: numSolves,
      duration_minutes: durationMinutes,
      avg_time: avgTimeStr ? parseFloat(avgTimeStr) : null,
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
              <Select value={event} onValueChange={setEvent}>
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
              <Select value={practiceType} onValueChange={setPracticeType}>
                <SelectTrigger className="min-h-11 w-full border-border bg-secondary/50 text-foreground">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {PRACTICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="solves" className="text-foreground">
                Number of Solves
              </Label>
              <Input
                id="solves"
                name="solves"
                type="number"
                placeholder="50"
                min={1}
                required
                className="min-h-11 border-border bg-secondary/50 text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="time" className="text-foreground">
                Time Practiced (minutes)
              </Label>
              <Input
                id="time"
                name="time"
                type="number"
                placeholder="45"
                min={1}
                required
                className="min-h-11 border-border bg-secondary/50 text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="avg" className="text-foreground">
                Result Average
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="avg"
                name="avg"
                type="text"
                placeholder="12.34"
                className="min-h-11 border-border bg-secondary/50 font-mono text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
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
