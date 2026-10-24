import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  FormSkeleton,
  ProductEditor,
} from "@/components/products/product-editor";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage() {
  return (
    <main className="max-w-3xl">
      <PageHeader title="Editar producto" />
      <Suspense fallback={<FormSkeleton />}>
        <ProductEditor />
      </Suspense>
    </main>
  );
}
