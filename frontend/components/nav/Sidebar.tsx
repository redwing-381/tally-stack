"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Landmark,
  BookOpen,
  Tags,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  PiggyBank,
  ScrollText,
  FileText,
  LogOut,
} from "lucide-react";
import type { Persona } from "@/lib/odoo/types";
import { cn } from "@/lib/utils";

// Grouped rather than one flat list: eleven destinations read as a wall
// otherwise, and the groups mirror how the work actually runs — set up the
// master data, record against it, then report on it.
const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "/dashboard" }],
  },
  {
    label: "Master data",
    items: [
      { href: "/contacts", label: "Contacts", icon: Users, match: "/contacts" },
      { href: "/products", label: "Products", icon: Package, match: "/products" },
      { href: "/accounts", label: "Chart of accounts", icon: Landmark, match: "/accounts" },
      { href: "/journals", label: "Journals", icon: BookOpen, match: "/journals" },
      { href: "/analytic-accounts", label: "Analytic accounts", icon: Tags, match: "/analytic-accounts" },
    ],
  },
  {
    label: "Transactions",
    items: [
      { href: "/sales", label: "Sales", icon: ShoppingCart, match: "/sales" },
      { href: "/purchases", label: "Purchases", icon: Truck, match: "/purchases" },
      { href: "/journal-entries", label: "Journal entries", icon: ArrowLeftRight, match: "/journal-entries" },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/budgets", label: "Budgets", icon: PiggyBank, match: "/budgets" },
      { href: "/reports/balance-sheet", label: "Reports", icon: ScrollText, match: "/reports" },
    ],
  },
];

const PORTAL_GROUPS = [
  {
    label: null,
    items: [{ href: "/portal/invoices", label: "My invoices", icon: FileText, match: "/portal/invoices" }],
  },
];

const PERSONA_LABEL: Record<Persona, string> = {
  admin: "Admin",
  invoicing: "Invoicing user",
  portal: "Customer",
  unknown: "unknown",
};

export function Sidebar({ persona, name }: { persona: Persona; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = persona === "portal" ? PORTAL_GROUPS : NAV_GROUPS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex shrink-0 items-center gap-3 px-5 py-6">
        <Image src="/logo-mark.png" alt="" width={36} height={36} className="shrink-0" />
        <div>
          <p className="font-heading text-xl italic">Tally Stack</p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/60">Urban Furniture</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((group, i) => (
          <div key={group.label ?? `group-${i}`} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pb-1 pt-2 text-xs text-sidebar-foreground/45">{group.label}</p>
            )}
            {group.items.map(({ href, label, icon: Icon, match }) => {
              const active = pathname === match || pathname.startsWith(match + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-5 py-4">
        <p className="text-sm">{name}</p>
        <p className="text-xs text-sidebar-foreground/60">{PERSONA_LABEL[persona]}</p>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}
