"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { savePartner } from "@/lib/odoo/actions";
import type { Partner } from "@/lib/odoo/types";

// res.partner.image_1920 is the source image Odoo resizes the rest from.
// Anything much larger than this is a phone photo nobody needs at full size.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function ContactFormDialog({
  contact,
  countries,
  trigger,
}: {
  contact?: Partner & { image_128?: string | false };
  countries: { id: number; name: string }[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(contact?.name ?? "");
  const [type, setType] = useState<"customer" | "vendor" | "both">(
    (contact?.partner_type || "customer") as "customer" | "vendor" | "both",
  );
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [mobile, setMobile] = useState(contact?.mobile || "");
  const [city, setCity] = useState(contact?.city || "");
  const [countryId, setCountryId] = useState(
    contact?.country_id ? String(contact.country_id[0]) : "",
  );
  const [stateId, setStateId] = useState(contact?.state_id ? String(contact.state_id[0]) : "");
  const [states, setStates] = useState<{ id: number; name: string }[]>(
    // Seed with the contact's own state so the field shows a name, not a raw
    // id, before the full list for its country arrives.
    contact?.state_id ? [{ id: contact.state_id[0], name: contact.state_id[1] }] : [],
  );
  const [zip, setZip] = useState(contact?.zip || "");
  // null = untouched, so an edit that doesn't change the photo leaves the
  // existing one alone instead of clearing it.
  const [image, setImage] = useState<string | null>(null);
  const preview = image ?? (contact?.image_128 || null);

  // States are per-country and there are thousands worldwide, so they're
  // fetched for the chosen country when the dialog opens or the country
  // changes, rather than shipped with the page.
  useEffect(() => {
    if (!open || !countryId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/odoo/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "res.country.state",
            method: "search_read",
            args: [[["country_id", "=", Number(countryId)]], ["name"]],
            kwargs: { order: "name" },
          }),
        });
        const data = await res.json();
        if (!cancelled && data.ok) setStates(data.result);
      } catch {
        // Keep whatever is already listed; the field stays usable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, countryId]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("That image is over 2 MB. Pick a smaller one.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result).split(",")[1] ?? null);
    reader.readAsDataURL(file);
  }

  function onSave() {
    startTransition(async () => {
      try {
        await savePartner(contact?.id ?? null, {
          name,
          partner_type: type,
          email,
          phone,
          mobile,
          city,
          zip,
          state_id: stateId ? Number(stateId) : false,
          country_id: countryId ? Number(countryId) : false,
          ...(image === null ? {} : { image_1920: image }),
        });
        toast.success(contact ? "Contact updated." : "Contact added.");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save that contact.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${preview}`}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-heading text-lg text-muted-foreground">
                  {name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {preview ? "Change photo" : "Add photo"}
              </Button>
              {preview && (
                <button
                  type="button"
                  onClick={() => {
                    setImage("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="ml-3 text-sm text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Contact type</Label>
            <Select
              items={[
                { value: "customer", label: "Customer" },
                { value: "vendor", label: "Vendor" },
                { value: "both", label: "Both" },
              ]}
              value={type}
              onValueChange={(v) => v && setType(v as typeof type)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">Pincode</Label>
              <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select
                items={countries.map((c) => ({ value: String(c.id), label: c.name }))}
                value={countryId}
                onValueChange={(v) => {
                  if (!v) return;
                  setCountryId(v);
                  // The old state belongs to the old country; Odoo would
                  // reject that pairing, so clear it with the country.
                  setStateId("");
                  setStates([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select
                items={states.map((s) => ({ value: String(s.id), label: s.name }))}
                value={stateId}
                onValueChange={(v) => v && setStateId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={countryId ? "Choose a state" : "Pick a country first"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={pending || !name}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? "Saving…" : "Save contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
