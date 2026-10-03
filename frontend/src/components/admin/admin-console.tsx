"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, ChevronDown, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Palette, Package, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, getProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Pill, cardCls as card, selectCls as select } from "./ui";
import { ProductsSection } from "./products-section";
import { SettingsSection, type StoreSettings } from "./settings-section";

type OrderItem = {
  id: string;
  title: string;
  product_title?: string | null;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  design?: { id: string; status?: string; preview?: string };
};
type AdminOrder = {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  email: string | null;
  fulfillment_status?: string;
  payment_status?: string;
  items: OrderItem[];
  razorpay?: { id?: string; status: string; mode?: string; method?: string };
  shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; city?: string | null; postal_code?: string | null; phone?: string | null } | null;
};
type Quote = { _id: string; name: string; company?: string; email: string; phone?: string; product?: string; quantity?: number; message?: string; status: string; notes?: string; createdAt: string };
type DesignRow = { id: string; product: string; color: string; preview?: string; status: string; statusNote?: string; medusaOrderId?: string; summary: string; createdAt: string };

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "production", label: "Production", icon: Palette },
  { id: "products", label: "Products & stock", icon: Boxes },
  { id: "quotes", label: "Quotes", icon: Inbox },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["id"];

const QUOTE_STATUSES = ["new", "contacted", "won", "lost"];
const DESIGN_STATUSES: [string, string][] = [
  ["ordered", "Ordered"],
  ["approved", "Design approved"],
  ["in_production", "In production"],
  ["shipped", "Shipped"],
];
const statusLabel = (s?: string) => DESIGN_STATUSES.find(([v]) => v === s)?.[1] ?? (s === "pending" ? "Saved" : (s ?? "Saved"));
const MEDUSA_BASE = process.env.NEXT_PUBLIC_MEDUSA_URL ?? "";

const date = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const designTone = (s?: string) =>
  s === "shipped" ? "bg-emerald-50 text-emerald-700" : s === "in_production" ? "bg-amber-50 text-amber-700" : s === "approved" ? "bg-[#DCEAF5] text-[#1F5A8C]" : "bg-[#EAF1F7] text-[#113858]";

function orderState(o: AdminOrder): { label: string; tone: string } {
  if (o.status === "canceled") return { label: "Cancelled", tone: "bg-slate-100 text-slate-600" };
  if (o.fulfillment_status === "delivered") return { label: "Delivered", tone: "bg-emerald-50 text-emerald-700" };
  if (o.fulfillment_status === "shipped" || o.fulfillment_status === "partially_shipped") return { label: "Shipped", tone: "bg-[#DCEAF5] text-[#1F5A8C]" };
  if (o.status === "completed") return { label: "Completed", tone: "bg-emerald-50 text-emerald-700" };
  return { label: "Processing", tone: "bg-[#EAF1F7] text-[#113858]" };
}

export function AdminConsole({ admin, settings }: { admin: { email: string; name: string }; settings: StoreSettings }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [designFilter, setDesignFilter] = useState("all");
  const [quoteFilter, setQuoteFilter] = useState("all");

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/admin");
        throw new Error("Session expired, please sign in again");
      }
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    // Each source loads independently so one outage (e.g. Medusa down) doesn't blank the rest
    const [o, q, d] = await Promise.allSettled([call("/api/admin/orders"), call("/api/admin/quotes"), call("/api/admin/designs")]);
    if (o.status === "fulfilled") setOrders(o.value.orders);
    else toast.error(`Orders: ${o.reason?.message ?? "could not load"}`);
    if (q.status === "fulfilled") setQuotes(q.value.quotes);
    else toast.error(`Quotes: ${q.reason?.message ?? "could not load"}`);
    if (d.status === "fulfilled") setDesigns(d.value.designs);
    else toast.error(`Production: ${d.reason?.message ?? "could not load"}`);
    setLoading(false);
  }, [call]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function patch(path: string, body: unknown, apply: () => void) {
    try {
      await call(path, { method: "PATCH", body: JSON.stringify(body) });
      apply();
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const live = orders.filter((o) => o.status !== "canceled");
  const revenue = live.reduce((n, o) => n + o.total, 0);
  const newQuotes = quotes.filter((q) => q.status === "new").length;
  const inProduction = designs.filter((d) => d.status === "in_production").length;
  const toApprove = designs.filter((d) => d.status === "ordered").length;
  const shownDesigns = designFilter === "all" ? designs : designs.filter((d) => d.status === designFilter);
  const shownQuotes = quoteFilter === "all" ? quotes : quotes.filter((q) => q.status === quoteFilter);

  const setDesignStatus = (id: string, status: string) =>
    patch(`/api/admin/designs/${id}`, { status }, () => {
      setDesigns((all) => all.map((x) => (x.id === id ? { ...x, status } : x)));
      setOrders((all) => all.map((o) => ({ ...o, items: o.items.map((i) => (i.design?.id === id ? { ...i, design: { ...i.design, status } } : i)) })));
    });

  async function downloadDesign(id: string) {
    try {
      const full = await call(`/api/designs/${id}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: "application/json" }));
      Object.assign(document.createElement("a"), { href: url, download: `design-${id}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the design");
    }
  }

  const stats = [
    { label: "Orders", value: String(live.length), sub: `${orders.length - live.length} cancelled` },
    { label: "Revenue", value: formatPrice(revenue), sub: "excluding cancelled" },
    { label: "Designs to approve", value: String(toApprove), sub: `${inProduction} in production` },
    { label: "New quotes", value: String(newQuotes), sub: `${quotes.length} total` },
  ];

  const badge: Partial<Record<Tab, number>> = { production: toApprove, quotes: newQuotes };

  return (
    <div className="min-h-screen bg-[#EAF1F7] pb-20">
      <div className="bg-gradient-to-br from-[#0B2A45] via-[#113858] to-[#1F5A8C] px-4 pb-24 pt-6 sm:px-8">
        <div className="mx-auto mb-10 flex max-w-[1180px] items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/cottson.png" alt="COTTSON" className="h-7 w-auto max-w-[130px] object-contain brightness-0 invert" />
            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Admin</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8DB8DC]">Admin dashboard</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] sm:text-[34px]">{admin.name || "Welcome"}</h1>
            <p className="text-[14px] text-white/70">{admin.email}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={load} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#113858] transition hover:bg-[#EAF1F7] disabled:opacity-60">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={signOut} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/10">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-14 max-w-[1180px] px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Admin sections" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[#113858]/[0.08] bg-white p-2 shadow-[0_8px_30px_rgba(17,56,88,0.06)] lg:h-fit lg:flex-col lg:overflow-visible">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn("flex h-11 shrink-0 items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition", tab === t.id ? "bg-[#113858] text-white" : "text-[#35516B] hover:bg-[#EAF1F7]")}
              >
                <t.icon size={17} />
                {t.label}
                {!!badge[t.id] && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px]", tab === t.id ? "bg-white/20" : "bg-[#113858] text-white")}>{badge[t.id]}</span>}
              </button>
            ))}
          </nav>

          <div className="min-w-0 space-y-6">
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 xl:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label} className={card}>
                      <p className="text-[12px] font-medium text-[#5B7690]">{s.label}</p>
                      <p className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-[#0B2A45]">{s.value}</p>
                      <p className="text-[12px] text-[#5B7690]">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className={card}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold text-[#0B2A45]">Recent orders</h2>
                    <button type="button" onClick={() => setTab("orders")} className="text-[13px] font-semibold text-[#1F5A8C] hover:underline">View all</button>
                  </div>
                  {orders.length ? (
                    <ul className="divide-y divide-[#113858]/[0.07]">
                      {orders.slice(0, 5).map((o) => (
                        <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                          <span className="font-semibold text-[#0B2A45]">#{o.display_id}</span>
                          <span className="min-w-0 flex-1 truncate text-[#5B7690]">{o.email}</span>
                          <Pill tone={orderState(o).tone}>{orderState(o).label}</Pill>
                          <span className="w-24 text-right font-semibold text-[#0B2A45]">{formatPrice(o.total)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[14px] text-[#5B7690]">{loading ? "Loading…" : "No orders yet."}</p>
                  )}
                </div>
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className={card}>
                    <h2 className="mb-3 text-[17px] font-semibold text-[#0B2A45]">Needs your attention</h2>
                    <ul className="space-y-2 text-[14px] text-[#35516B]">
                      <li><button type="button" onClick={() => setTab("production")} className="hover:underline">{toApprove} design{toApprove === 1 ? "" : "s"} waiting for approval</button></li>
                      <li><button type="button" onClick={() => setTab("quotes")} className="hover:underline">{newQuotes} new quote request{newQuotes === 1 ? "" : "s"}</button></li>
                    </ul>
                  </div>
                  <div className={card}>
                    <h2 className="mb-3 text-[17px] font-semibold text-[#0B2A45]">Medusa admin</h2>
                    <p className="text-[14px] text-[#35516B]">Products, inventory, shipping and payments are managed in the Medusa dashboard.</p>
                    <a href={`${MEDUSA_BASE}/app`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1F5A8C] hover:underline">
                      Open Medusa <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </>
            )}

            {tab === "orders" && (
              <div className={card}>
                <h2 className="text-[17px] font-semibold text-[#0B2A45]">Orders</h2>
                <p className="mb-4 text-[13px] text-[#5B7690]">{orders.length} order{orders.length === 1 ? "" : "s"}, newest first</p>
                {orders.length === 0 && <p className="text-[14px] text-[#5B7690]">{loading ? "Loading…" : "No orders yet."}</p>}
                <div className="space-y-3">
                  {orders.map((o) => {
                    const st = orderState(o);
                    const open = openOrder === o.id;
                    const a = o.shipping_address;
                    return (
                      <div key={o.id} className="rounded-2xl border border-[#113858]/10">
                        <button type="button" onClick={() => setOpenOrder(open ? null : o.id)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left">
                          <span className="text-[15px] font-semibold text-[#0B2A45]">#{o.display_id}</span>
                          <span className="text-[13px] text-[#5B7690]">{date(o.created_at)}</span>
                          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#35516B]">{o.email}</span>
                          <Pill tone={st.tone}>{st.label}</Pill>
                          <span className="text-[15px] font-semibold text-[#0B2A45]">{formatPrice(o.total)}</span>
                          <ChevronDown size={18} className={cn("text-[#5B7690] transition", open && "rotate-180")} />
                        </button>
                        {open && (
                          <div className="space-y-4 border-t border-[#113858]/[0.07] p-4 text-[13.5px] text-[#35516B]">
                            <ul className="space-y-3">
                              {o.items.map((i) => (
                                <li key={i.id} className="flex items-center gap-3">
                                  {i.design?.preview ? <img src={i.design.preview} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-[#EAF1F7] text-[#5B7690]"><Package size={16} /></span>}
                                  <span className="min-w-0 flex-1">
                                    {i.quantity} × {i.product_title || i.title}
                                    {i.variant_title && <span className="text-[#5B7690]"> · {i.variant_title}</span>}
                                  </span>
                                  {i.design && <Pill tone={designTone(i.design.status)}>{statusLabel(i.design.status)}</Pill>}
                                  <span className="w-24 text-right font-medium">{formatPrice(i.quantity * i.unit_price)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="grid gap-4 border-t border-[#113858]/[0.07] pt-4 sm:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7690]">Deliver to</p>
                                {a ? (
                                  <p className="mt-1 leading-relaxed">
                                    {[a.first_name, a.last_name !== "-" && a.last_name].filter(Boolean).join(" ")}<br />
                                    {a.address_1}<br />
                                    {[a.city, a.postal_code].filter(Boolean).join(" ")}
                                    {a.phone && <><br />{a.phone}</>}
                                  </p>
                                ) : <p className="mt-1">No address</p>}
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7690]">Status</p>
                                <p className="mt-1">Payment: {o.payment_status?.replace(/_/g, " ") ?? "—"}<br />Fulfilment: {o.fulfillment_status?.replace(/_/g, " ") ?? "—"}</p>
                                <a href={`${MEDUSA_BASE}/app/orders/${o.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#1F5A8C] hover:underline">
                                  Manage in Medusa <ExternalLink size={13} />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "production" && (
              <div className={card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#0B2A45]">Production queue</h2>
                    <p className="text-[13px] text-[#5B7690]">Customer designs from placed orders</p>
                  </div>
                  <select className={select} value={designFilter} onChange={(e) => setDesignFilter(e.target.value)} aria-label="Filter by status">
                    <option value="all">All statuses</option>
                    {DESIGN_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {shownDesigns.length === 0 && <p className="text-[14px] text-[#5B7690]">{loading ? "Loading…" : "No designs here."}</p>}
                <div className="grid gap-4 md:grid-cols-2">
                  {shownDesigns.map((d) => (
                    <div key={d.id} className="flex gap-4 rounded-2xl border border-[#113858]/10 p-4">
                      {d.preview ? <img src={d.preview} alt="" className="size-24 shrink-0 rounded-xl bg-[#EAF1F7] object-cover" /> : <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-[#EAF1F7] text-[#5B7690]"><Palette size={22} /></span>}
                      <div className="min-w-0 flex-1 text-[13.5px]">
                        <p className="truncate text-[15px] font-semibold text-[#0B2A45]">{getProduct(d.product)?.title ?? d.product}</p>
                        <p className="truncate text-[#5B7690]">{d.color} · {d.medusaOrderId ?? "no order"}</p>
                        <p className="mt-1 text-[#35516B]">{d.summary}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <select className={select} value={d.status} onChange={(e) => setDesignStatus(d.id, e.target.value)} aria-label="Design status">
                            {DESIGN_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <button type="button" onClick={() => downloadDesign(d.id)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1F5A8C] hover:underline">
                            <FileText size={13} /> Design file
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "products" && <ProductsSection call={call} />}

            {tab === "settings" && <SettingsSection s={settings} />}

            {tab === "quotes" && (
              <div className={card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#0B2A45]">Quote requests</h2>
                    <p className="text-[13px] text-[#5B7690]">Bulk-order enquiries from the website</p>
                  </div>
                  <select className={select} value={quoteFilter} onChange={(e) => setQuoteFilter(e.target.value)} aria-label="Filter by status">
                    <option value="all">All statuses</option>
                    {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {shownQuotes.length === 0 && <p className="text-[14px] text-[#5B7690]">{loading ? "Loading…" : "No quote requests here."}</p>}
                <div className="space-y-3">
                  {shownQuotes.map((q) => (
                    <div key={q._id} className="rounded-2xl border border-[#113858]/10 p-4 text-[13.5px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold text-[#0B2A45]">{q.name}{q.company && <span className="font-normal text-[#5B7690]"> · {q.company}</span>}</p>
                        <select className={select} value={q.status} aria-label="Quote status" onChange={(e) => patch(`/api/admin/quotes/${q._id}`, { status: e.target.value }, () => setQuotes((all) => all.map((x) => (x._id === q._id ? { ...x, status: e.target.value } : x))))}>
                          {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <p className="mt-1 text-[#35516B]">
                        <a className="font-medium text-[#1F5A8C] hover:underline" href={`mailto:${q.email}`}>{q.email}</a>
                        {q.phone && ` · ${q.phone}`}
                        {q.product && ` · ${getProduct(q.product)?.title ?? q.product}`}
                        {q.quantity && ` · ${q.quantity} pcs`} · {date(q.createdAt)}
                      </p>
                      {q.message && <p className="mt-2 whitespace-pre-wrap text-[#35516B]">{q.message}</p>}
                      <textarea
                        defaultValue={q.notes ?? ""}
                        placeholder="Internal notes (saved when you click away)"
                        rows={2}
                        className="mt-3 w-full rounded-xl border border-[#113858]/15 bg-[#F5F8FA] p-3 text-[13.5px] outline-none focus:border-[#113858]"
                        onBlur={(e) => e.target.value !== (q.notes ?? "") && patch(`/api/admin/quotes/${q._id}`, { notes: e.target.value }, () => setQuotes((all) => all.map((x) => (x._id === q._id ? { ...x, notes: e.target.value } : x))))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
