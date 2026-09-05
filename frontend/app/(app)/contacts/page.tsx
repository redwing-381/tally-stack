import Link from "next/link";
import { Plus } from "lucide-react";
import { searchRead } from "@/lib/odoo/client";
import type { Partner } from "@/lib/odoo/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "customer", label: "Customers" },
  { value: "vendor", label: "Vendors" },
  { value: "both", label: "Both" },
] as const;

export default async function ContactsPage(props: PageProps<"/contacts">) {
  const searchParams = await props.searchParams;
  const filter = (Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type) ?? "all";

  const domain = filter === "all" ? [] : [["partner_type", "=", filter]];
  const contacts = await searchRead<Partner>(
    "res.partner",
    domain,
    ["name", "partner_type", "email", "phone", "city"],
    { order: "name" },
  );

  return (
    <div className="p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customers and vendors.</p>
        </div>
        <ContactFormDialog
          trigger={<Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus size={15} /> New contact
          </Button>} countries={[]}        />
      </div>

      <div className="mt-6 flex gap-1 border-b border-border">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/contacts" : `/contacts?type=${f.value}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              filter === f.value
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>City</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>
                {c.partner_type && <Badge variant="outline">{c.partner_type}</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
              <TableCell className="text-right">
                <ContactFormDialog
                  contact={c}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>} countries={[]}                />
              </TableCell>
            </TableRow>
          ))}
          {contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No contacts here yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
