"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteBudget } from "@/lib/odoo/actions";

export function DeleteBudgetButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      className="text-sm text-muted-foreground hover:text-destructive"
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteBudget(id);
            router.refresh();
          } catch {
            toast.error("Couldn't delete that budget.");
          }
        })
      }
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
