"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Clock, ShoppingCart, SlidersHorizontal, X, Check } from "lucide-react";
import { type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

// Every category we sell in, even ones with no live product yet — so the sidebar reads as a
// real catalog nav rather than growing/shrinking with whatever happens to be in stock.
const CATEGORIES = ["Shirts", "T-Shirts", "Jacket", "Hoodies", "Sweatshirt", "Towels", "Cap", "Trousers"];

const PRODUCTION = [
  { label: "7 days or less", value: 7 },
  { label: "14 days or less", value: 14 },
  { label: "21 days or less", value: 21 },
  { label: "30 days or less", value: 30 },
];
const MIN_QTY = [
  { label: "1 or less", value: 1, exact: false },
  { label: "Min. 25", value: 25, exact: true },
  { label: "50 or less", value: 50, exact: false },
  { label: "100 or less", value: 100, exact: false },
  { label: "250 or less", value: 250, exact: false },
];
const TOGGLES = [
  { key: "customColor", title: "Custom color items only", desc: "No restriction on the base color — we can match your exact brand color." },
  { key: "printOnDemand", title: "Print on demand only", desc: "Made only when ordered: zero upfront investment or stock holding." },
  { key: "livePreview", title: "Live preview items only", desc: "Design your pieces and see the final result instantly." },
  { key: "express", title: "Express items only", desc: "Finished and ready to ship in days." },
  { key: "promo", title: "Promo items only", desc: "Budget-friendly promotional items." },
] as const;
type ToggleKey = (typeof TOGGLES)[number]["key"];

function toggleIn<T>(set: React.Dispatch<React.SetStateAction<T[]>>, v: T) {
  set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
}

function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: { label: string; value: number }[];
  selected: number[];
  onToggle: (v: number) => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((o) => {
        const on = selected.includes(o.value);
        return (
          <li key={o.value}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-[14px] font-medium text-[#113858] transition-colors hover:bg-[var(--shop-tint)]">
              <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} className="peer sr-only" />
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F5A8C]/50",
                  on ? "border-[#113858] bg-[#113858] text-white" : "border-[var(--shop-line-strong)] bg-white"
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {o.label}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-[#113858]" : "bg-[#113858]/15")}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}

function FilterButton({
  icon,
  label,
  count,
  open,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  open?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "flex h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[14px] font-semibold transition-colors",
        count > 0 || open
          ? "border-[#113858] bg-[#113858] text-white"
          : "border-[var(--shop-line)] bg-white text-[#113858] hover:border-[var(--shop-line-strong)] hover:bg-[var(--shop-tint)]"
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-white text-[11px] font-bold text-[#113858]">{count}</span>
      )}
    </button>
  );
}

function PillDropdown({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <FilterButton icon={icon} label={label} count={count} open={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-[240px] rounded-[20px] border border-[var(--shop-line)] bg-white p-3 shadow-[0_20px_50px_rgba(17,56,88,0.16)] sm:left-auto sm:right-0">
          {children}
        </div>
      )}
    </div>
  );
}

// Products-page palette: tonal blues built on the brand navy (#113858). ProductCard reads these
// with fallbacks, so it looks unchanged on other pages.
const SHOP_PALETTE = {
  "--shop-ink": "#113858",
  "--shop-card": "#FFFFFF",
  "--shop-accent": "#1F5A8C",
  "--shop-muted": "#566C82",
  "--shop-surface": "#EEF3F8",
  "--shop-tint": "#DDE9F4",
  "--shop-tint-2": "#CADCEC",
  "--shop-line": "#D6E1EC",
  "--shop-line-strong": "#AFC3D5",
} as React.CSSProperties;

export function CategoryFilter({ products }: { products: Product[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [qty, setQty] = useState<number[]>([]);
  const [flags, setFlags] = useState<ToggleKey[]>([]);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", esc);
    };
  }, [drawer]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [products]);

  const visible = products
    .filter((p) => (active ? p.category === active : true))
    .filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((p) => days.length === 0 || (p.productionDays ?? 28) <= Math.max(...days))
    .filter(
      (p) =>
        qty.length === 0 ||
        MIN_QTY.some((o) => qty.includes(o.value) && (o.exact ? p.minBulk === o.value : p.minBulk <= o.value))
    )
    .filter((p) => flags.every((f) => p[f] === true));

  const chips = [
    ...days.map((d) => ({ id: `d${d}`, label: `${d} days or less`, remove: () => toggleIn(setDays, d) })),
    ...qty.map((q) => ({ id: `q${q}`, label: MIN_QTY.find((o) => o.value === q)!.label, remove: () => toggleIn(setQty, q) })),
    ...flags.map((f) => ({
      id: f,
      label: TOGGLES.find((t) => t.key === f)!.title.replace(" only", ""),
      remove: () => toggleIn(setFlags, f),
    })),
  ];
  const clearAll = () => {
    setDays([]);
    setQty([]);
    setFlags([]);
  };

  return (
    <div style={SHOP_PALETTE}>
      {/* Header band */}
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--shop-tint)] via-[var(--shop-surface)] to-white px-6 py-10 ring-1 ring-inset ring-[#D6E1EC] sm:rounded-[32px] sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#1F5A8C]/[0.07]" />
        <p
          className="relative mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--shop-muted)] sm:text-[12px]"
        >
          {active ? "Category" : "Catalogue"}
        </p>
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] text-[#113858] sm:text-[44px]">
          {active ?? "All products"}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[color:var(--shop-muted)]">
          {active
            ? `Our ${active.toLowerCase()} range — made to order with your logo and brand colors.`
            : "Browse our corporate clothing. Pick a style, choose your colors, add your logo."}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        {/* Sidebar: search + categories */}
        <aside className="h-fit min-w-0 lg:sticky lg:top-28">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--shop-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-[var(--shop-line)] bg-white pl-11 pr-4 text-[14px] text-[#113858] outline-none transition-colors placeholder:text-[color:var(--shop-muted)] focus:border-[var(--shop-accent)] focus:ring-4 focus:ring-[#1F5A8C]/15"
            />
          </div>

          <p className="mb-3 mt-7 hidden text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--shop-muted)] lg:block">
            Categories
          </p>
          <ul className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {[null, ...CATEGORIES].map((c) => {
              const on = active === c;
              const n = c === null ? products.length : (counts.get(c) ?? 0);
              return (
                <li key={c ?? "all"} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(c)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-full px-4 py-2.5 text-[14px] font-semibold transition-colors",
                      on ? "bg-[var(--shop-tint)] text-[#113858] ring-1 ring-inset ring-[var(--shop-line-strong)]" : "text-[#113858] hover:bg-[var(--shop-tint)]"
                    )}
                  >
                    <span>{c ?? "Show all"}</span>
                    <span className={cn("text-[12px] font-medium", on ? "text-[#113858]" : "text-[color:var(--shop-muted)]")}>{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Results */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-[#113858]">
              {visible.length} {visible.length === 1 ? "result" : "results"}
            </p>
            <div className="flex flex-wrap gap-2">
              <PillDropdown icon={<Clock className="size-4" />} label="Production time" count={days.length}>
                <CheckList items={PRODUCTION} selected={days} onToggle={(v) => toggleIn(setDays, v)} />
              </PillDropdown>
              <PillDropdown icon={<ShoppingCart className="size-4" />} label="Min. quantity" count={qty.length}>
                <CheckList items={MIN_QTY} selected={qty} onToggle={(v) => toggleIn(setQty, v)} />
              </PillDropdown>
              <FilterButton
                icon={<SlidersHorizontal className="size-4" />}
                label="More filters"
                count={flags.length}
                onClick={() => setDrawer(true)}
              />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={c.remove}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--shop-tint)] py-1.5 pl-3.5 pr-2.5 text-[13px] font-semibold text-[#113858] transition-colors hover:bg-[var(--shop-tint-2)]"
                >
                  {c.label}
                  <X className="size-3.5" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="px-2 text-[13px] font-semibold text-[color:var(--shop-muted)] underline-offset-2 hover:text-[#113858] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {visible.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] bg-[var(--shop-surface)] px-6 py-16 text-center">
              <p className="text-[18px] font-bold text-[#113858]">No products match these filters</p>
              <p className="mt-2 text-[14px] text-[color:var(--shop-muted)]">Try removing a filter or searching for something else.</p>
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setQuery("");
                  setActive(null);
                }}
                className="mt-6 rounded-full bg-[#113858] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b243a]"
              >
                Reset everything
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-[#0b243a]/40 backdrop-blur-[2px]" onClick={() => setDrawer(false)}>
          <aside
            role="dialog"
            aria-label="Filters"
            className="flex h-full w-full max-w-md flex-col bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--shop-line)] px-7 py-5">
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#113858]">Filters</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setDrawer(false)}
                className="grid size-10 place-items-center rounded-full bg-[var(--shop-surface)] text-[#113858] transition-colors hover:bg-[var(--shop-tint)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-7 py-6">
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--shop-muted)]">Production time</h3>
                <CheckList items={PRODUCTION} selected={days} onToggle={(v) => toggleIn(setDays, v)} />
              </section>
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--shop-muted)]">Min. quantity</h3>
                <CheckList items={MIN_QTY} selected={qty} onToggle={(v) => toggleIn(setQty, v)} />
              </section>
              <section className="space-y-5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--shop-muted)]">Product type</h3>
                {TOGGLES.map((t) => (
                  <div key={t.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[15px] font-semibold text-[#113858]">{t.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--shop-muted)]">{t.desc}</p>
                    </div>
                    <Switch label={t.title} checked={flags.includes(t.key)} onChange={() => toggleIn(setFlags, t.key)} />
                  </div>
                ))}
              </section>
            </div>

            <div className="flex gap-3 border-t border-[var(--shop-line)] px-7 py-5">
              <button
                type="button"
                onClick={clearAll}
                disabled={chips.length === 0}
                className="h-12 flex-1 rounded-full border border-[var(--shop-line-strong)] text-[14px] font-semibold text-[#113858] transition-colors hover:bg-[var(--shop-tint)] disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="h-12 flex-[1.4] rounded-full bg-[#113858] text-[14px] font-semibold text-white transition-colors hover:bg-[#0b243a]"
              >
                Show {visible.length} {visible.length === 1 ? "result" : "results"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
