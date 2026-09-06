"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Radial motion-trail starfield on a canvas.
 *
 * Stars spawn at a random angle from the centre and accelerate outward;
 * each frame draws a line from the previous position to the new one, and
 * the whole canvas is painted with a translucent ground colour rather than
 * cleared — that partial repaint is what leaves the trails.
 *
 * The ground is a parameter (not hard-coded black) so the trails fade into
 * this app's own ink rather than punching a black hole through the page.
 */

interface Star {
  x: number;
  y: number;
  vX: number;
  vY: number;
  alpha: number;
  size: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Canvas can't take a Tailwind class, so rather than duplicate the palette
 * as literals here, read the token off the element. The ledger palette in
 * globals.css stays the single source of truth for both.
 */
function resolveToken(el: Element, value: string, fallback: string): string {
  if (!value.startsWith("--")) return value;
  const resolved = getComputedStyle(el).getPropertyValue(value).trim();
  return /^#[0-9a-fA-F]{6}$/.test(resolved) ? resolved : fallback;
}

export function StarfieldBackground({
  starCount = 340,
  starSpeed = 1.035,
  trailOpacity = 0.88,
  starColor = "--sidebar-primary",
  groundColor = "--sidebar",
  starSize = 0.6,
  className,
}: {
  starCount?: number;
  starSpeed?: number;
  trailOpacity?: number;
  starColor?: string;
  groundColor?: string;
  starSize?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const starHex = resolveToken(canvas, starColor, "#b8862f");
    const groundHex = resolveToken(canvas, groundColor, "#12241a");
    const [r, g, b] = hexToRgb(starHex);
    const [gr, gg, gb] = hexToRgb(groundHex);
    const stars: Star[] = [];

    function spawn(star: Star) {
      const angle = Math.random() * Math.PI * 2;
      const vX = Math.cos(angle);
      const vY = Math.sin(angle);

      // Half the stars start out near the rim and half near the centre.
      // That split is what makes the field read as a warp rather than a
      // drift: velocity grows exponentially with distance travelled, so
      // without a steady supply of already-distant stars every star is
      // crawling at ~1px/frame and draws a dot instead of a streak.
      const spread = Math.max(canvas!.width, canvas!.height) / 2;
      const reach =
        Math.random() > 0.5
          ? spread * (0.45 + Math.random() * 0.55)
          : Math.random() * spread * 0.3;

      star.x = canvas!.width / 2 + vX * reach;
      star.y = canvas!.height / 2 + vY * reach;
      star.vX = vX * (1 + reach / spread);
      star.vY = vY * (1 + reach / spread);
      // Floor the alpha — a plain Math.random() leaves a third of the field
      // effectively invisible.
      star.alpha = 0.35 + Math.random() * 0.65;
      star.size = starSize;
    }

    function resize() {
      const parent = canvas!.parentElement;
      canvas!.width = parent?.offsetWidth ?? window.innerWidth;
      canvas!.height = parent?.offsetHeight ?? window.innerHeight;
      ctx!.fillStyle = groundHex;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    }

    resize();
    for (let i = 0; i < starCount; i++) {
      const star: Star = { x: 0, y: 0, vX: 0, vY: 0, alpha: 0, size: starSize };
      spawn(star);
      stars.push(star);
    }

    // A warp field is exactly the kind of motion that triggers vestibular
    // discomfort, so honour the OS setting: paint one still frame and stop.
    const stillPreferred = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function drawStill() {
      ctx!.fillStyle = groundHex;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      for (const s of stars) {
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${s.alpha * 0.7})`;
        ctx!.fillRect(s.x, s.y, 1.4, 1.4);
      }
    }

    let frame = 0;
    function render() {
      // Partial repaint — the alpha here is what smears each star into a streak.
      ctx!.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${1 - trailOpacity})`;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (const s of stars) {
        const prevX = s.x;
        const prevY = s.y;
        const nextX = s.x + s.vX;
        const nextY = s.y + s.vY;

        if (nextX < 0 || nextX > canvas!.width || nextY < 0 || nextY > canvas!.height) {
          spawn(s);
          continue;
        }

        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${s.alpha})`;
        ctx!.lineWidth = s.size;
        ctx!.beginPath();
        ctx!.moveTo(prevX, prevY);
        ctx!.lineTo(nextX, nextY);
        ctx!.stroke();

        s.x = nextX;
        s.y = nextY;
        s.vX *= starSpeed;
        s.vY *= starSpeed;
        s.size *= 1.01;
      }

      frame = requestAnimationFrame(render);
    }

    if (stillPreferred) drawStill();
    else render();

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (stillPreferred) drawStill();
      }, 120);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [starCount, starSpeed, trailOpacity, starColor, groundColor, starSize]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
