"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

const REFRESH_MS = 15000;

/**
 * The dashboard's data is already fresh on every load — every Odoo call
 * underneath it uses cache: "no-store". What it didn't have is a reason to
 * re-fetch while the tab just sits open. router.refresh() re-runs this
 * route's Server Components in place (no full reload, no lost scroll
 * position), so a plain interval calling it is enough to make an open
 * dashboard tab track Odoo's real state — same idea as PaymentStatusPoller
 * elsewhere in this app, just refreshing a page instead of one card.
 */
export function LiveRefresher() {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const clock = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const tick = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    setSpinning(true);
    router.refresh();
    setSecondsAgo(0);
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <button
      onClick={refresh}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <RotateCw size={12} className={spinning ? "animate-spin" : ""} />
      {secondsAgo === 0 ? "Updated just now" : `Updated ${secondsAgo}s ago`}
    </button>
  );
}
