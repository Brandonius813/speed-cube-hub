"use client";

import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsvTemplate } from "@/lib/csv/csv-template";

type CsvDropZoneProps = {
  onFileSelected: (file: File) => void;
  error: string | null;
};

export function CsvDropZone({ onFileSelected, error }: CsvDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
        }`}
      >
        <Upload
          className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop a CSV file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum 500 rows, 1MB file size
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={downloadCsvTemplate}
        className="w-fit gap-2 text-muted-foreground hover:text-foreground"
      >
        <Download className="h-4 w-4" />
        Download CSV Template
      </Button>
    </div>
  );
}
