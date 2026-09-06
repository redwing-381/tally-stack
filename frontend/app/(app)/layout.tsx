import { cookies } from "next/headers";
import { Sidebar } from "@/components/nav/Sidebar";
import { AgentButton } from "@/components/agent/AgentButton";
import { PERSONA_COOKIE, NAME_COOKIE } from "@/lib/odoo/session";
import type { Persona } from "@/lib/odoo/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const persona = (jar.get(PERSONA_COOKIE)?.value as Persona) ?? "unknown";
  const name = jar.get(NAME_COOKIE)?.value ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
      <Sidebar persona={persona} name={name} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
        {persona === "unknown" ? (
          <div className="p-10">
            <p className="font-heading text-xl">No access assigned yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your account isn&apos;t a member of the Urban Furniture Admin or
              Invoicing User group. Contact an administrator to get set up.
            </p>
          </div>
        ) : (
          children
        )}
      </div>
      <AgentButton persona={persona} />
    </div>
  );
}
