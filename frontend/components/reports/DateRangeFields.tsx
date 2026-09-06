"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The From/To pair for the Budget report's period filter.
 *
 * The surrounding form stays a plain GET form — the period lives in the URL
 * so a report view can be bookmarked and shared. Only these two inputs need
 * to be client-side, to keep `min`/`max` pointed at each other as you type:
 * without that, the native picker happily offers an end date before the
 * start and the report just returns nothing.
 */
export function DateRangeFields({ from, to }: { from: string; to: string }) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          name="from"
          type="date"
          className="w-44"
          value={start}
          max={end || undefined}
          onChange={(e) => {
            setStart(e.target.value);
            if (e.target.value && end && end < e.target.value) setEnd(e.target.value);
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          name="to"
          type="date"
          className="w-44"
          value={end}
          min={start || undefined}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
    </>
  );
}
