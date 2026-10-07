import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/catalog-server";
import { formatPrice } from "@/lib/catalog";
import { Notice, PageHeader, Panel } from "@/components/admin/ui";
import { ProductForm } from "../forms";
import { RemoveProductButton, RestoreProductButton } from "../product-row-actions";

export const metadata: Metadata = { title: "Add products" };
export const dynamic = "force-dynamic";

export default async function Page() {
  let all: Awaited<ReturnType<typeof listProducts>> = [];
  let shop: typeof all = [];
  let unavailable = false;
  try {
    all = await listProducts({ includeHidden: true });
    shop = await listProducts();
  } catch {
    unavailable = true;
  }
  const live = new Set(shop.map((p) => p.slug));
  const products = all.filter((p) => live.has(p.slug));
  const removed = all.filter((p) => !live.has(p.slug));
  return (
    <div className="space-y-5">
      <PageHeader title="Add products" description="Products added here appear in the shop and design studio straight away." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="New product">
          <ProductForm />
        </Panel>
        <Panel title={`Catalogue (${products.length})`} flush className="h-fit">
          {unavailable && (
            <div className="p-4">
              <Notice tone="danger">Catalogue unavailable. Check the MongoDB connection.</Notice>
            </div>
          )}
          <ul className="max-h-[700px] divide-y divide-slate-100 overflow-auto">
            {products.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <Link href={`/products/${p.slug}`} className="block truncate text-[13px] font-medium text-slate-900 hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-[12px] text-slate-500">
                    {p.category} · {formatPrice(p.price)}
                  </p>
                </div>
                <RemoveProductButton slug={p.slug} title={p.title} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {removed.length > 0 && (
        <Panel title={`Removed from the shop (${removed.length})`} flush>
          <ul className="divide-y divide-slate-100">
            {removed.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-900">{p.title}</p>
                  <p className="text-[12px] text-slate-500">{p.category}</p>
                </div>
                <RestoreProductButton slug={p.slug} title={p.title} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
