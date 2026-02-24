"use client";

import type { CsTimerParsedSession } from "@/lib/cstimer/parse-cstimer";
import { formatDuration } from "@/lib/utils";

type CsTimerPreviewTableProps = {
  sessions: CsTimerParsedSession[];
  secondsPerSolve: number;
};

function getDuration(numSolves: number, secondsPerSolve: number) {
  return Math.max(1, Math.ceil((numSolves * secondsPerSolve) / 60));
}

export function CsTimerPreviewTable({
  sessions,
  secondsPerSolve,
}: CsTimerPreviewTableProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Mobile card layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {sessions.map((s) => (
          <MobileCard
            key={s.session_date}
            session={s}
            secondsPerSolve={secondsPerSolve}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-3 pr-3 text-left text-sm font-medium text-muted-foreground">
                Date
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                Solves
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                DNFs
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                Avg Time
              </th>
              <th className="pb-3 pr-3 text-right text-sm font-medium text-muted-foreground">
                Best Time
              </th>
              <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <DesktopRow
                key={s.session_date}
                session={s}
                secondsPerSolve={secondsPerSolve}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCard({
  session,
  secondsPerSolve,
}: {
  session: CsTimerParsedSession;
  secondsPerSolve: number;
}) {
  const duration = getDuration(session.num_solves, secondsPerSolve);

  return (
    <div className="rounded-lg border border-border/30 bg-secondary/30 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {session.session_date}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{session.num_solves} solves</span>
            {session.num_dnf > 0 && (
              <span className="text-amber-500">
                {session.num_dnf} DNF{session.num_dnf !== 1 ? "s" : ""}
              </span>
            )}
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {session.avg_time !== null ? (
            <div className="font-mono text-sm font-semibold text-foreground">
              {session.avg_time.toFixed(2)}s
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">All DNF</div>
          )}
          {session.best_time !== null && (
            <div className="font-mono text-xs text-muted-foreground">
              Best: {session.best_time.toFixed(2)}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopRow({
  session,
  secondsPerSolve,
}: {
  session: CsTimerParsedSession;
  secondsPerSolve: number;
}) {
  const duration = getDuration(session.num_solves, secondsPerSolve);

  return (
    <tr className="border-b border-border/30 last:border-0 hover:bg-secondary/30">
      <td className="py-3 pr-3 text-sm text-foreground">
        {session.session_date}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-sm text-foreground">
        {session.num_solves}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-sm">
        {session.num_dnf > 0 ? (
          <span className="text-amber-500">{session.num_dnf}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-sm text-foreground">
        {session.avg_time !== null ? `${session.avg_time.toFixed(2)}s` : "--"}
      </td>
      <td className="py-3 pr-3 text-right font-mono text-sm text-foreground">
        {session.best_time !== null
          ? `${session.best_time.toFixed(2)}s`
          : "--"}
      </td>
      <td className="py-3 text-right font-mono text-sm text-foreground">
        {formatDuration(duration)}
      </td>
    </tr>
  );
}
