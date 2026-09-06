import Image from "next/image";
import Link from "next/link";
import { StarfieldBackground } from "@/components/landing/StarfieldBackground";

export const metadata = {
  title: "Tally Stack — Urban Furniture Accounting",
  description:
    "Every order, invoice, payment and budget for Urban Furniture in one ledger — posted properly, and current the moment you look.",
};

const PROOF = [
  "Double-entry on Odoo 17",
  "Portal payments via Razorpay",
  "Balance sheet, P&L and budgets",
  "Plain-English assistant",
];

/**
 * Public landing page. Uses the sidebar half of the ledger palette — the
 * same dark forest ground and brass the signed-in app already puts down
 * the left of every screen — so arriving at the dashboard feels continuous
 * rather than like a different product.
 */
export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sidebar px-6 py-20">
      <StarfieldBackground />

      {/* Pools the ground back over the centre so the streaks never fight
          the copy. color-mix keeps this keyed to the token, not a literal. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 46% 38% at 50% 46%, color-mix(in srgb, var(--sidebar) 88%, transparent) 0%, color-mix(in srgb, var(--sidebar) 55%, transparent) 55%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <Image src="/logo-mark.png" alt="" width={76} height={76} priority />

        <h1 className="mt-6 font-heading text-5xl italic text-sidebar-foreground sm:text-6xl">
          Tally Stack
        </h1>

        <p className="mt-3 text-sm uppercase tracking-[0.18em] text-sidebar-primary">
          Urban Furniture — Accounting
        </p>

        <p className="mt-7 max-w-lg text-lg leading-relaxed text-sidebar-foreground/75">
          Every order, invoice, payment and budget in one ledger — posted properly,
          and current the moment you look.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-accent px-7 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="border border-sidebar-border px-7 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:border-sidebar-primary hover:text-sidebar-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
          >
            Create an account
          </Link>
        </div>

        <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-sidebar-foreground/50">
          {PROOF.map((item, i) => (
            <li key={item} className="flex items-center gap-5">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-sidebar-border" aria-hidden />}
              {item}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
