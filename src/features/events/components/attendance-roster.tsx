"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { setEventAttendanceAction } from "../actions/event.actions";

export interface AttendanceRow {
  userId: string;
  name: string;
  status: "GOING" | "WAITLISTED";
  attended: boolean;
}

interface AttendanceRosterProps {
  eventId: string;
  rows: AttendanceRow[];
}

/** Organizer and moderator tool. Only members who are going can be marked as attended. */
export function AttendanceRoster({ eventId, rows }: AttendanceRosterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setAttended(row: AttendanceRow, attended: boolean): void {
    setError(null);
    setActiveUserId(row.userId);
    startTransition(async () => {
      const result = await setEventAttendanceAction({ eventId, attendeeUserId: row.userId, attended });
      setActiveUserId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-brand-muted">No one has registered yet.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-brand-border">
        {rows.map((row) => (
          <li key={row.userId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="break-words font-semibold">{row.name}</span>
              {row.status === "WAITLISTED" ? <Badge variant="outline">Waitlist</Badge> : null}
              {row.attended ? <Badge variant="secondary">Attended</Badge> : null}
            </div>
            {row.status === "GOING" ? (
              <Button
                size="sm"
                variant={row.attended ? "outline" : "default"}
                onClick={() => setAttended(row, !row.attended)}
                disabled={isPending}
                aria-label={`${row.attended ? "Clear attendance for" : "Mark attended"} ${row.name}`}
              >
                {isPending && activeUserId === row.userId
                  ? "Saving..."
                  : row.attended
                    ? "Clear attended"
                    : "Mark attended"}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <FormAlert tone="error" message={error} />
    </div>
  );
}
