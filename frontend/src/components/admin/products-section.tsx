"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Pill, cardCls, inputCls, selectCls, type AdminCall } from "./ui";

type Variant = { id: string; sku: string | null; color: string; size: string; tracked: boolean; stocked: number | null; reserved: number | null };
type Product = { id: string; title: string; handle: string; category: string | null; status: string; thumbnail: string | null; price: number | null; variants: Variant[] };

const LOW = 10;
// Sizes in garment order rather than alphabetical
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const sizeRank = (s: string) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : SIZE_ORDER.length);

const available = (v: Variant) => (v.tracked ? (v.stocked ?? 0) - (v.reserved ?? 0) : Infinity);

export function ProductsSection({ call }: { call: AdminCall }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [location, setLocation] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "low" | "out">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ product: string; done: number; total: number } | null>(null);
  const [bulkQty, setBulkQty] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = (await call("/api/admin/products")) as { products: Product[]; location: { name: string } | null };
      setProducts(d.products);
      setLocation(d.location);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products");
    }
    setLoading(false);
  }, [call]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const patchVariant = (pid: string, vid: string, stocked: number | null) =>
    setProducts((all) =>
      all.map((p) => (p.id === pid ? { ...p, variants: p.variants.map((v) => (v.id === vid ? { ...v, tracked: stocked !== null, stocked, reserved: stocked === null ? null : (v.reserved ?? 0) } : v)) } : p))
    );

  /** Saves one variant. Returns whether it worked (bulk updates stop on the first failure). */
  async function save(p: Product, v: Variant, raw: string, quiet = false) {
    const text = raw.trim();
    const quantity = text === "" ? null : Number(text);
    if (quantity !== null && !(Number.isInteger(quantity) && quantity >= 0)) {
      toast.error("Stock must be a whole number, or empty for made to order");
      return false;
    }
    setSaving((s) => new Set(s).add(v.id));
    try {
      await call(`/api/admin/products/${p.id}/variants/${v.id}/stock`, { method: "PUT", body: JSON.stringify({ quantity }) });
      patchVariant(p.id, v.id, quantity);
      if (!quiet) toast.success(quantity === null ? "Back to made to order" : `Stock set to ${quantity}`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save stock");
      return false;
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
      setDrafts((d) => {
        const n = { ...d };
        delete n[v.id];
        return n;
      });
    }
  }

  async function applyAll(p: Product, raw: string) {
    setBulk({ product: p.id, done: 0, total: p.variants.length });
    let done = 0;
    for (const v of p.variants) {
      if (!(await save(p, v, raw, true))) break;
      setBulk({ product: p.id, done: ++done, total: p.variants.length });
    }
    setBulk(null);
    toast.success(done === p.variants.length ? "All variants updated" : `Stopped after ${done} of ${p.variants.length} variants`);
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${p.title} ${p.handle} ${p.category ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "tracked") return p.variants.some((v) => v.tracked);
      if (filter === "low") return p.variants.some((v) => v.tracked && available(v) > 0 && available(v) <= LOW);
      if (filter === "out") return p.variants.some((v) => v.tracked && available(v) <= 0);
      return true;
    });
  }, [products, query, filter]);

  const trackedTotal = products.reduce((n, p) => n + p.variants.filter((v) => v.tracked).length, 0);

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-[#0B2A45]">Products &amp; stock</h2>
          <p className="text-[13px] text-[#5B7690]">
            {products.length} products · {trackedTotal} tracked variants{location ? ` · stock held at ${location.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5B7690]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className={cn(inputCls, "w-48 pl-8")} />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={selectCls} aria-label="Filter products">
            <option value="all">All products</option>
            <option value="tracked">With tracked stock</option>
            <option value="low">Low stock (≤ {LOW})</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-[#EAF1F7] px-4 py-3 text-[13px] leading-relaxed text-[#35516B]">
        COTTSON is made to order, so every variant is <strong>unlimited</strong> until you give it a number. Enter a quantity to start tracking that colour and size: customers then cannot order more than what is left,
        and it counts down as orders come in. Clear the box to make it unlimited again.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
      {loading && !products.length && <p className="mt-6 text-[14px] text-[#5B7690]">Loading products…</p>}
      {!loading && !error && shown.length === 0 && <p className="mt-6 text-[14px] text-[#5B7690]">No products match.</p>}

      <div className="mt-5 space-y-3">
        {shown.map((p) => {
          const isOpen = open === p.id;
          const tracked = p.variants.filter((v) => v.tracked);
          const low = tracked.filter((v) => available(v) > 0 && available(v) <= LOW).length;
          const out = tracked.filter((v) => available(v) <= 0).length;
          const colors = [...new Set(p.variants.map((v) => v.color))];
          const sizes = [...new Set(p.variants.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));
          const cell = (c: string, s: string) => p.variants.find((v) => v.color === c && v.size === s);
          const working = bulk?.product === p.id;

          return (
            <div key={p.id} className="rounded-2xl border border-[#113858]/10">
              <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left">
                {p.thumbnail ? <img src={p.thumbnail} alt="" className="size-12 shrink-0 rounded-lg bg-[#EAF1F7] object-cover" /> : <span className="size-12 shrink-0 rounded-lg bg-[#EAF1F7]" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[#0B2A45]">{p.title}</span>
                  <span className="block truncate text-[12.5px] text-[#5B7690]">{[p.category, p.handle].filter(Boolean).join(" · ")}</span>
                </span>
                {p.price != null && <span className="text-[14px] font-semibold text-[#0B2A45]">{formatPrice(p.price)}</span>}
                <span className="flex flex-wrap gap-1.5">
                  {tracked.length === 0 ? <Pill>Made to order</Pill> : <Pill tone="bg-[#DCEAF5] text-[#1F5A8C]">{tracked.length} tracked</Pill>}
                  {low > 0 && <Pill tone="bg-amber-50 text-amber-700">{low} low</Pill>}
                  {out > 0 && <Pill tone="bg-red-50 text-red-700">{out} out</Pill>}
                </span>
                <ChevronDown size={18} className={cn("text-[#5B7690] transition", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-[#113858]/[0.07] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium text-[#35516B]">All {p.variants.length} variants:</span>
                    <input
                      value={bulkQty}
                      onChange={(e) => setBulkQty(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="Quantity"
                      aria-label={`Quantity for every variant of ${p.title}`}
                      className={cn(inputCls, "w-28")}
                    />
                    <button type="button" disabled={working || bulkQty === ""} onClick={() => applyAll(p, bulkQty)} className="h-9 rounded-lg bg-[#113858] px-4 text-[12px] font-semibold uppercase tracking-wider text-white transition hover:bg-[#0b243a] disabled:opacity-50">
                      Set all
                    </button>
                    <button type="button" disabled={working} onClick={() => applyAll(p, "")} className="h-9 rounded-lg border border-[#113858]/20 px-4 text-[12px] font-semibold uppercase tracking-wider text-[#113858] transition hover:bg-[#EAF1F7] disabled:opacity-50">
                      Make all unlimited
                    </button>
                    {working && (
                      <span className="inline-flex items-center gap-1.5 text-[#5B7690]">
                        <Loader2 size={14} className="animate-spin" /> {bulk.done} of {bulk.total}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-separate border-spacing-y-1.5 text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#5B7690]">
                          <th className="pr-3">Colour</th>
                          {sizes.map((s) => (
                            <th key={s} className="px-1 text-center">{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colors.map((c) => (
                          <tr key={c}>
                            <td className="whitespace-nowrap pr-3 font-medium text-[#0B2A45]">{c}</td>
                            {sizes.map((s) => {
                              const v = cell(c, s);
                              if (!v) return <td key={s} className="px-1 text-center text-[#5B7690]/50">—</td>;
                              const avail = available(v);
                              const busy = saving.has(v.id);
                              const value = drafts[v.id] ?? (v.stocked ?? "").toString();
                              return (
                                <td key={s} className="px-1 text-center align-top">
                                  <div className="relative mx-auto w-16">
                                    <input
                                      value={value}
                                      disabled={busy || working}
                                      inputMode="numeric"
                                      placeholder="∞"
                                      aria-label={`${p.title} ${c} ${s} stock`}
                                      onChange={(e) => setDrafts((d) => ({ ...d, [v.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                                      onBlur={() => drafts[v.id] !== undefined && drafts[v.id] !== (v.stocked ?? "").toString() && save(p, v, drafts[v.id])}
                                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                                      className={cn(
                                        "h-9 w-full rounded-lg border bg-white px-1 text-center text-[13px] font-medium outline-none focus:border-[#113858] disabled:opacity-60",
                                        !v.tracked ? "border-[#113858]/10 text-[#5B7690]" : avail <= 0 ? "border-red-300 bg-red-50 text-red-700" : avail <= LOW ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[#113858]/25 text-[#0B2A45]"
                                      )}
                                    />
                                    {busy && <Loader2 size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-[#5B7690]" />}
                                    {v.tracked && !!v.reserved && <span className="mt-0.5 block text-[10.5px] text-[#5B7690]">{v.reserved} reserved</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[12px] text-[#5B7690]">Empty (∞) means made to order. Changes save when you click away or press Enter.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
