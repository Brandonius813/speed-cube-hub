"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileSpreadsheet, Timer } from "lucide-react";
import { SessionForm } from "./session-form";
import { CsvImport } from "./csv-import";
import { CsTimerImport } from "./cstimer-import";

type Mode = "single" | "import" | "cstimer";

export function LogPageContent() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Log Session
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Record your practice and track your progress.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-1 self-start">
        <Button
          type="button"
          variant={mode === "single" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("single")}
          className="gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          Single Session
        </Button>
        <Button
          type="button"
          variant={mode === "import" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("import")}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import CSV
        </Button>
        <Button
          type="button"
          variant={mode === "cstimer" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("cstimer")}
          className="gap-2"
        >
          <Timer className="h-4 w-4" />
          csTimer
        </Button>
      </div>

      {/* Content */}
      {mode === "single" && <SessionForm />}
      {mode === "import" && <CsvImport />}
      {mode === "cstimer" && <CsTimerImport />}
    </div>
  );
}
