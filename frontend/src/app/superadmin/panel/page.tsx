import type { Metadata } from "next";
import Link from "next/link";
import { isSuperadmin } from "@/lib/superadmin";
import { listProducts } from "@/lib/catalog-server";
import { formatPrice } from "@/lib/catalog";
import { ProductForm } from "../forms";
import { logout } from "../actions";
import { SessionGuard } from "../session-guard";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Superadmin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const authenticated = await isSuperadmin();
  if (!authenticated) redirect("/superadmin");
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let unavailable = false;
  try { products = await listProducts(); } catch { unavailable = true; }
  return <SessionGuard><div className="mx-auto max-w-6xl px-6 pt-32 pb-20">
    <div className="mb-10 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-slate-500">COTTSON administration</p><h1 className="mt-2 text-4xl font-semibold">Product catalog</h1></div><div className="flex items-center gap-5"><Link href="/products" className="text-sm underline">View shop</Link><form action={logout}><button className="rounded-xl border px-4 py-2">Sign out</button></form></div></div>
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]"><section className="rounded-3xl border bg-slate-50 p-6 sm:p-8"><h2 className="mb-6 text-2xl font-semibold">Add a product</h2><ProductForm /></section><aside className="rounded-3xl border p-6"><h2 className="mb-5 text-xl font-semibold">Products ({products.length})</h2>{unavailable && <p role="alert">Catalog unavailable. Check the MongoDB connection.</p>}<ul className="max-h-[700px] space-y-4 overflow-auto">{products.map((p) => <li key={p.slug} className="border-b pb-4"><Link href={`/products/${p.slug}`} className="font-medium hover:underline">{p.title}</Link><p className="mt-1 text-sm text-slate-500">{p.category} · {formatPrice(p.price)}</p></li>)}</ul></aside></div>
  </div></SessionGuard>;
}
