import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { searchRead } from "@/lib/odoo/client";
import { PERSONA_COOKIE } from "@/lib/odoo/session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewInvoicingUserDialog } from "@/components/users/NewInvoicingUserDialog";
import { NewCustomerLoginDialog } from "@/components/users/NewCustomerLoginDialog";

interface UserRow {
  id: number;
  name: string;
  login: string;
  email: string | false;
  share: boolean;
  groups_id: number[];
  partner_id: [number, string] | false;
}

export default async function UsersPage() {
  const jar = await cookies();
  if (jar.get(PERSONA_COOKIE)?.value !== "admin") {
    redirect("/dashboard");
  }

  const [groups, users, unlinkedContacts] = await Promise.all([
    searchRead<{ id: number; name: string }>(
      "res.groups",
      [["name", "in", ["Urban Furniture / Admin", "Urban Furniture / Invoicing User"]]],
      ["name"],
    ),
    searchRead<UserRow>(
      "res.users",
      [["active", "=", true]],
      ["name", "login", "email", "share", "groups_id", "partner_id"],
      { order: "share, name" },
    ),
    // Contacts a Customer login can be granted to: a real customer/vendor
    // "both" contact that doesn't already have one.
    searchRead<{ id: number; name: string; user_ids: number[] }>(
      "res.partner",
      [["partner_type", "in", ["customer", "both"]]],
      ["name", "user_ids"],
      { order: "name" },
    ),
  ]);

  const adminGroupId = groups.find((g) => g.name === "Urban Furniture / Admin")?.id;
  const invoicingGroupId = groups.find((g) => g.name === "Urban Furniture / Invoicing User")?.id;

  function roleOf(u: UserRow): string {
    if (u.share) return "Customer";
    if (adminGroupId && u.groups_id.includes(adminGroupId)) return "Admin";
    if (invoicingGroupId && u.groups_id.includes(invoicingGroupId)) return "Invoicing user";
    return "Internal";
  }

  const contactsWithoutLogin = unlinkedContacts.filter((c) => c.user_ids.length === 0);

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grant an Invoicing user their own login, or give a customer portal access.
          </p>
        </div>
        <div className="flex gap-2">
          <NewCustomerLoginDialog contacts={contactsWithoutLogin} />
          <NewInvoicingUserDialog />
        </div>
      </div>

      <Table containerClassName="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Login</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{u.login}</TableCell>
              <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
              <TableCell>
                <Badge variant={u.share ? "secondary" : "outline"}>{roleOf(u)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
