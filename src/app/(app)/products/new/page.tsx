import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <main className="max-w-3xl">
      <PageHeader title="Nuevo producto" />
      <ProductForm />
    </main>
  );
}
