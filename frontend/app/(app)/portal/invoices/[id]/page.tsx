import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";

export default async function PortalInvoiceDetailPage(props: PageProps<"/portal/invoices/[id]">) {
  const { id } = await props.params;
  return <InvoiceDocument invoiceId={Number(id)} mode="portal" />;
}
