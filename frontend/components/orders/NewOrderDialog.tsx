"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSaleOrder, createPurchaseOrder } from "@/lib/odoo/actions";

interface Option {
  id: number;
  name: string;
}

interface Line {
  productId: string;
  qty: string;
  priceUnit: string;
  taxId: string;
}

const EMPTY_LINE: Line = { productId: "", qty: "1", priceUnit: "", taxId: "default" };

export function NewOrderDialog({
  kind,
  partners,
  products,
  taxes,
  partnerLabel,
}: {
  kind: "sale" | "purchase";
  partners: Option[];
  products: Option[];
  taxes: Option[];
  partnerLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [partnerId, setPartnerId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function onSave() {
    // Price and tax are only sent when actually overridden — "Default" leaves
    // Odoo to apply the product's own price and the customer's usual tax.
    const parsedLines = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: Number(l.productId),
        qty: Number(l.qty) || 1,
        ...(l.priceUnit.trim() === "" ? {} : { priceUnit: Number(l.priceUnit) }),
        ...(l.taxId === "default" ? {} : { taxIds: l.taxId === "none" ? [] : [Number(l.taxId)] }),
      }));

    if (!partnerId || parsedLines.length === 0) return;

    startTransition(async () => {
      try {
        const id =
          kind === "sale"
            ? await createSaleOrder(Number(partnerId), parsedLines)
            : await createPurchaseOrder(Number(partnerId), parsedLines);
        setOpen(false);
        router.push(`/${kind === "sale" ? "sales" : "purchases"}/${id}`);
      } catch {
        toast.error("Couldn't create the order.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus size={15} /> New order
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New {kind === "sale" ? "sales" : "purchase"} order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{partnerLabel}</Label>
            <Select
              items={partners.map((p) => ({ value: String(p.id), label: p.name }))}
              value={partnerId}
              onValueChange={(v) => setPartnerId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${partnerLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order lines</Label>
            {/* Column names sit once above the rows rather than repeating as a
                label on every field, so the lines read as a ledger. */}
            <div className="grid grid-cols-[1fr_4rem_6rem_8rem_1.5rem] gap-2 text-xs text-muted-foreground">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span>Tax</span>
              <span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_6rem_8rem_1.5rem] items-center gap-2">
                <Select
                  items={products.map((p) => ({ value: String(p.id), label: p.name }))}
                  value={line.productId}
                  onValueChange={(v) => updateLine(i, { productId: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => updateLine(i, { qty: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Auto"
                  value={line.priceUnit}
                  onChange={(e) => updateLine(i, { priceUnit: e.target.value })}
                />
                <Select
                  items={[
                    { value: "default", label: "Default" },
                    { value: "none", label: "No tax" },
                    ...taxes.map((t) => ({ value: String(t.id), label: t.name })),
                  ]}
                  value={line.taxId}
                  onValueChange={(v) => updateLine(i, { taxId: v ?? "default" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="none">No tax</SelectItem>
                    {taxes.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove line"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
              className="text-sm text-accent hover:underline"
            >
              + Add line
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !partnerId}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Creating…" : "Create order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
