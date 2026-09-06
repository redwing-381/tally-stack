"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveProduct } from "@/lib/odoo/actions";
import { PRODUCT_TYPES } from "@/lib/accounting";
import type { Product } from "@/lib/odoo/types";

export function ProductFormDialog({
  product,
  categories,
  trigger,
}: {
  product?: Product;
  categories: { id: number; name: string }[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [type, setType] = useState<"consu" | "service">(product?.detailed_type ?? "consu");
  const [salesPrice, setSalesPrice] = useState(String(product?.list_price ?? ""));
  const [cost, setCost] = useState(String(product?.standard_price ?? ""));
  const [categoryId, setCategoryId] = useState(
    product?.categ_id ? String(product.categ_id[0]) : categories[0] ? String(categories[0].id) : "",
  );

  // A negative price isn't a product anyone sells — it silently inverts the
  // sign of every order line built from it, so block it at the source.
  const negative = (v: string) => v !== "" && Number(v) < 0;
  const priceError = negative(salesPrice) && "Sales price can't be negative.";
  const costError = negative(cost) && "Cost can't be negative.";
  const valid = Boolean(name.trim()) && !priceError && !costError;

  function onSave() {
    if (!valid) return;
    startTransition(async () => {
      try {
        await saveProduct(product?.id ?? null, {
          name,
          detailed_type: type,
          list_price: Number(salesPrice) || 0,
          standard_price: Number(cost) || 0,
          ...(categoryId ? { categ_id: Number(categoryId) } : {}),
        });
        toast.success(product ? "Product updated." : "Product added.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that product.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Product name</Label>
            <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                items={PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={type}
                onValueChange={(v) => v && setType(v as typeof type)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                items={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                value={categoryId}
                onValueChange={(v) => v && setCategoryId(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sales-price">Sales price</Label>
              <Input
                id="sales-price"
                type="number"
                min="0"
                step="0.01"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
              />
              <FieldError>{priceError}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
              <FieldError>{costError}</FieldError>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !valid}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
