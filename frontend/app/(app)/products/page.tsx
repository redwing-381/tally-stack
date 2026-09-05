import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { searchRead, searchCount } from "@/lib/odoo/client";
import type { Product } from "@/lib/odoo/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage, pageOffset, pageCount, buildPageHref } from "@/lib/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { productTypeLabel } from "@/lib/accounting";
import { formatMoney } from "@/lib/format";

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams.page);

  // sale_ok narrows this to things you actually trade, keeping Odoo's
  // internal service products (expense re-invoicing, down payments) out of
  // the catalogue the way getCatalogProducts does for the order pickers.
  const domain = [["sale_ok", "=", true]];

  const [products, total, categories] = await Promise.all([
    searchRead<Product>(
      "product.template",
      domain,
      ["name", "detailed_type", "list_price", "standard_price", "categ_id"],
      { order: "name", limit: PAGE_SIZE, offset: pageOffset(page) },
    ),
    searchCount("product.template", domain),
    searchRead<{ id: number; name: string }>("product.category", [], ["name"], { order: "name" }),
  ]);

  if (total > 0 && page > 1 && products.length === 0) {
    redirect(buildPageHref("/products", pageCount(total)));
  }

  return (
    <div className="flex h-full flex-col p-10">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">What you buy and sell.</p>
        </div>
        <ProductFormDialog
          categories={categories}
          trigger={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={15} /> New product
            </Button>
          }
        />
      </div>

      <Table containerClassName="mt-6 min-h-0 flex-1 overflow-y-auto">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Sales price</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{productTypeLabel(p.detailed_type)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.categ_id ? p.categ_id[1] : "—"}
              </TableCell>
              <TableCell className="tabular text-right font-mono">{formatMoney(p.list_price)}</TableCell>
              <TableCell className="tabular text-right font-mono">
                {formatMoney(p.standard_price)}
              </TableCell>
              <TableCell className="text-right">
                <ProductFormDialog
                  product={p}
                  categories={categories}
                  trigger={<button className="text-sm text-accent hover:underline">Edit</button>}
                />
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No products yet. Add the first one to start recording sales and purchases.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} basePath="/products" />
    </div>
  );
}
