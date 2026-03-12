"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Upload } from "lucide-react";
import { SessionForm } from "./session-form";

const ImportContent = dynamic(
  () =>
    import("@/components/import/import-content").then(
      (module) => module.ImportContent
    ),
  {
    loading: () => (
      <div className="rounded-xl border border-border/50 bg-card/20 p-8 text-center text-sm text-muted-foreground">
        Loading import assistant...
      </div>
    ),
  }
);

type Mode = "single" | "import";

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
          <Upload className="h-4 w-4" />
          Import from Timer
        </Button>
      </div>

      {/* Content */}
      {mode === "single" && <SessionForm />}
      {mode === "import" && <ImportContent />}
    </div>
  );
}
