"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Notice, PageHeader, Segmented, TableEmpty, btn, inputCls, money, rowHover, table, td, th } from "./ui";
import { useAdminData } from "./use-admin-api";
import { LOW_STOCK as LOW, available } from "@/lib/stock";

type Variant = { id: string; sku: string | null; color: string; size: string; tracked: boolean; stocked: number | null; reserved: number | null };
type Product = { id: string; title: string; handle: string; category: string | null; status: string; thumbnail: string | null; price: number | null; variants: Variant[] };
type Catalog = { products: Product[]; location: { name: string } | null };
type Filter = "all" | "tracked" | "low" | "out";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const sizeRank = (s: string) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : SIZE_ORDER.length);

export function ProductsPage() {
  const { data, setData, error, loading, reload, api } = useAdminData<Catalog>("/api/admin/products");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ product: string; done: number; total: number } | null>(null);
  const [bulkQty, setBulkQty] = useState("");

  const products = useMemo(() => data?.products ?? [], [data]);
  const location = data?.location;

  const stats = useMemo(() => {
    const has = (p: Product, f: (v: Variant) => boolean) => p.variants.some((v) => v.tracked && f(v));
    return {
      all: products.length,
      tracked: products.filter((p) => has(p, () => true)).length,
      low: products.filter((p) => has(p, (v) => available(v) > 0 && available(v) <= LOW)).length,
      out: products.filter((p) => has(p, (v) => available(v) <= 0)).length,
    };
  }, [products]);

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

  const patchVariant = (pid: string, vid: string, stocked: number | null) =>
    setData((d) => d && { ...d, products: d.products.map((p) => (p.id === pid ? { ...p, variants: p.variants.map((v) => (v.id === vid ? { ...v, tracked: stocked !== null, stocked, reserved: stocked === null ? null : (v.reserved ?? 0) } : v)) } : p)) });

  /** Saves one variant; resolves to whether it worked so bulk updates can stop on the first failure */
  async function save(p: Product, v: Variant, raw: string, quiet = false) {
    const text = raw.trim();
    const quantity = text === "" ? null : Number(text);
    if (quantity !== null && !(Number.isInteger(quantity) && quantity >= 0)) {
      toast.error("Stock must be a whole number, or empty for made to order");
      return false;
    }
    setSaving((s) => new Set(s).add(v.id));
    try {
      await api(`/api/admin/products/${p.id}/variants/${v.id}/stock`, { method: "PUT", body: JSON.stringify({ quantity }) });
      patchVariant(p.id, v.id, quantity);
      if (!quiet) toast.success(quantity === null ? "Set to made to order" : `Stock set to ${quantity}`);
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
    toast.success(done === p.variants.length ? "All variants updated" : `Stopped after ${done} of ${p.variants.length}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & stock"
        description={location ? `Stock is held at ${location.name}.` : "Stock levels for every colour and size."}
        actions={
          <button type="button" onClick={reload} disabled={loading} className={btn.secondary}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <Notice>
        Every variant is made to order, and so unlimited, until you give it a number. A number starts tracking that colour and size: customers can then order only what is left, and it counts down as orders arrive. Clear the box to go back to unlimited.
      </Notice>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter products by stock"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: stats.all },
            { id: "tracked", label: "Tracked", count: stats.tracked },
            { id: "low", label: `Low (≤ ${LOW})`, count: stats.low },
            { id: "out", label: "Out of stock", count: stats.out },
          ]}
        />
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className={cn(inputCls, "w-60 pl-8")} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className={table}>
          <thead>
            <tr>
              <th className={cn(th, "w-8 pr-0")} />
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Price</th>
              <th className={`${th} text-right`}>Variants</th>
              <th className={th}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <TableEmpty cols={6} loading={loading}>No products match.</TableEmpty>}
            {shown.map((p) => {
              const isOpen = open === p.id;
              const tracked = p.variants.filter((v) => v.tracked);
              const low = tracked.filter((v) => available(v) > 0 && available(v) <= LOW).length;
              const out = tracked.filter((v) => available(v) <= 0).length;
              const colors = [...new Set(p.variants.map((v) => v.color))];
              const sizes = [...new Set(p.variants.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));
              const working = bulk?.product === p.id;

              return (
                <Fragment key={p.id}>
                  <tr onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className={cn(rowHover, "cursor-pointer", isOpen && "bg-slate-50")}>
                    <td className={cn(td, "pr-0")}>
                      <ChevronRight size={14} className={cn("text-slate-400 transition", isOpen && "rotate-90")} />
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        {p.thumbnail ? <img src={p.thumbnail} alt="" className="size-9 shrink-0 rounded border border-slate-200 bg-slate-50 object-cover" /> : <span className="size-9 shrink-0 rounded border border-slate-200 bg-slate-50" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{p.title}</p>
                          <p className="truncate font-mono text-[11.5px] text-slate-400">{p.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-slate-500`}>{p.category ?? "—"}</td>
                    <td className={`${td} text-right tabular-nums text-slate-900`}>{p.price != null ? money(p.price) : "—"}</td>
                    <td className={`${td} text-right tabular-nums`}>{p.variants.length}</td>
                    <td className={td}>
                      {tracked.length === 0 ? (
                        <span className="text-slate-400">Made to order</span>
                      ) : (
                        <span className="text-slate-700">
                          {tracked.length} tracked
                          {low > 0 && <span className="text-amber-700"> · {low} low</span>}
                          {out > 0 && <span className="text-red-700"> · {out} out</span>}
                        </span>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="border-b border-slate-200 bg-slate-50/60 px-4 py-4">
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
                          <span className="text-slate-600">Apply to all {p.variants.length} variants</span>
                          <input
                            value={bulkQty}
                            onChange={(e) => setBulkQty(e.target.value.replace(/[^0-9]/g, ""))}
                            inputMode="numeric"
                            placeholder="Quantity"
                            aria-label={`Quantity for every variant of ${p.title}`}
                            className={cn(inputCls, "w-24")}
                          />
                          <button type="button" disabled={working || bulkQty === ""} onClick={() => applyAll(p, bulkQty)} className={btn.primary}>
                            Set
                          </button>
                          <button type="button" disabled={working} onClick={() => applyAll(p, "")} className={btn.secondary}>
                            Make unlimited
                          </button>
                          {working && (
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                              <Loader2 size={13} className="animate-spin" /> {bulk.done} of {bulk.total}
                            </span>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="border-separate border-spacing-x-1.5 border-spacing-y-1 text-[13px]">
                            <thead>
                              <tr className="text-[11.5px] font-medium uppercase tracking-wide text-slate-500">
                                <th className="py-1 pr-3 text-left font-medium">Colour</th>
                                {sizes.map((s) => (
                                  <th key={s} className="w-[68px] text-center font-medium">{s}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {colors.map((c) => (
                                <tr key={c}>
                                  <th scope="row" className="whitespace-nowrap pr-3 text-left font-medium text-slate-800">{c}</th>
                                  {sizes.map((s) => {
                                    const v = p.variants.find((x) => x.color === c && x.size === s);
                                    if (!v) return <td key={s} className="text-center text-slate-300">–</td>;
                                    const avail = available(v);
                                    const busy = saving.has(v.id);
                                    const value = drafts[v.id] ?? (v.stocked ?? "").toString();
                                    return (
                                      <td key={s} className="align-top">
                                        <div className="relative">
                                          <input
                                            value={value}
                                            disabled={busy || working}
                                            inputMode="numeric"
                                            placeholder="∞"
                                            aria-label={`${p.title}, ${c}, ${s}: stock`}
                                            onChange={(e) => setDrafts((d) => ({ ...d, [v.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                                            onBlur={() => drafts[v.id] !== undefined && drafts[v.id] !== (v.stocked ?? "").toString() && save(p, v, drafts[v.id])}
                                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                                            className={cn(
                                              "h-8 w-full rounded-md border bg-white px-1 text-center text-[13px] tabular-nums outline-none focus:border-[#113858] focus:ring-2 focus:ring-[#113858]/15 disabled:opacity-60",
                                              !v.tracked ? "border-slate-200 text-slate-400 placeholder:text-slate-300" : avail <= 0 ? "border-red-300 bg-red-50 text-red-800" : avail <= LOW ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 text-slate-900"
                                            )}
                                          />
                                          {busy && <Loader2 size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                                          {v.tracked && !!v.reserved && <span className="mt-0.5 block text-center text-[10.5px] text-slate-400">{v.reserved} held</span>}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-3 text-[12px] text-slate-500">∞ means made to order. Changes save when you click away or press Enter. &ldquo;Held&rdquo; units belong to orders already placed.</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
