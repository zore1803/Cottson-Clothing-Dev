"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { colorById, formatPrice, variantUrl, type Product } from "@/lib/catalog";
import { ColorSwatches } from "./color-swatches";

export function CatalogProductDetail({ product, initialColor }: { product: Product; initialColor: string }) {
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(product.sizes[0]);
  const selectColor = (id: string) => {
    setColor(id);
    const url = new URL(window.location.href);
    url.searchParams.set("color", id);
    window.history.replaceState(null, "", url);
  };
  return <section className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:pt-32">
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500"><Link href="/products" className="hover:underline">Products</Link> / {product.title}</nav>
    <div className="grid gap-8 lg:grid-cols-2">
      <div><div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-[#F5F8FA]"><Image key={color} src={variantUrl(product, color)} alt={`${product.title} in ${colorById(color).name}`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority /></div>
        <div className="mt-4 flex flex-wrap gap-3" aria-label="Colour photos">{product.colors.map((id) => <button key={id} type="button" onClick={() => selectColor(id)} aria-label={`View ${colorById(id).name}`} aria-pressed={color === id} className={`relative h-24 w-20 overflow-hidden rounded-xl border-2 ${color === id ? "border-[#113858]" : "border-transparent"}`}><Image src={variantUrl(product, id)} alt={colorById(id).name} fill sizes="80px" className="object-cover" /></button>)}</div>
      </div>
      <div className="space-y-6 text-[#113858]"><p className="text-sm font-semibold uppercase tracking-widest text-slate-500">{product.category}</p><h1 className="text-4xl font-bold">{product.title}</h1><p className="text-3xl font-semibold">{formatPrice(product.price, product.currency)} <span className="text-sm font-normal text-slate-500">per piece</span></p><p className="leading-relaxed text-slate-600">{product.description}</p>
        <section className="space-y-4 rounded-3xl bg-[#F5F8FA] p-6"><h2 className="font-semibold">Colour: {colorById(color).name}</h2><ColorSwatches colorIds={product.colors} value={color} onChange={selectColor} /></section>
        <section className="space-y-4 rounded-3xl bg-[#F5F8FA] p-6"><h2 className="font-semibold">Select size</h2><div className="flex flex-wrap gap-2">{product.sizes.map((s) => <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={`rounded-xl border px-4 py-3 font-medium ${size === s ? "border-[#113858] bg-[#113858] text-white" : "bg-white"}`}>{s}</button>)}</div></section>
        <div className="flex flex-wrap gap-4 text-sm"><span>Minimum order: {product.minBulk} pieces</span><span>Production: {product.productionDays ?? 28} days</span></div>
        <Link href={`/contact?${new URLSearchParams({ product: product.slug, color, size })}`} className="block rounded-xl bg-[#113858] px-6 py-4 text-center font-semibold text-white">Enquire about this product</Link>
      </div>
    </div>
  </section>;
}
