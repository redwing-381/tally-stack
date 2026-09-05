import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";

export default async function InvoiceDetailPage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  return <InvoiceDocument invoiceId={Number(id)} mode="internal" />;
}
