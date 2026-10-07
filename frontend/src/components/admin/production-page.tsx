"use client";

import { useMemo, useState } from "react";
import { CalendarClock, FileDown, GripVertical, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { getProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Notice, PageHeader, btn, inputCls, selectCls } from "./ui";
import { DESIGN_STEPS, type AdminOrder, type DesignRow } from "./types";
import { useAdminData } from "./use-admin-api";

// Board of customer designs by production step. Cards move between columns with the select.
export function ProductionPage() {
  const designs = useAdminData<{ designs: DesignRow[] }>("/api/admin/designs");
  const orders = useAdminData<{ orders: AdminOrder[] }>("/api/admin/orders");
  const { api } = designs;
  const [query, setQuery] = useState("");
  const [now] = useState(() => Date.now()); // fixed for this visit; Refresh reloads the page data, a new visit gets a new time
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStep, setOverStep] = useState<string | null>(null);

  const orderNo = useMemo(() => new Map((orders.data?.orders ?? []).map((o) => [o.id, o.display_id])), [orders.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return (designs.data?.designs ?? []).filter((d) => {
      if (!q) return true;
      const no = String(orderNo.get(d.medusaOrderId ?? "") ?? "");
      return no === q || (getProduct(d.product)?.title ?? d.product).toLowerCase().includes(q) || d.color.toLowerCase().includes(q);
    });
  }, [designs.data, query, orderNo]);

  async function move(d: DesignRow, status: string) {
    if (d.status === status) return;
    const previous = d.status;
    designs.setData((cur) => cur && { designs: cur.designs.map((x) => (x.id === d.id ? { ...x, status } : x)) }); // move it at once, undo if the save fails
    try {
      await api(`/api/admin/designs/${d.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      designs.setData((cur) => cur && { designs: cur.designs.map((x) => (x.id === d.id ? { ...x, status: previous } : x)) });
      toast.error(e instanceof Error ? e.message : "Could not move the design");
    }
  }

  async function download(d: DesignRow) {
    try {
      const full = await api(`/api/designs/${d.id}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: "application/json" }));
      Object.assign(document.createElement("a"), { href: url, download: `design-${d.id}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download the design");
    }
  }

  /** Due date: the order date plus the product's production days. Shipped work is never late. */
  const due = (d: DesignRow) => {
    const at = new Date(d.orderedAt ?? d.createdAt).getTime() + (d.productionDays ?? 28) * 86_400_000;
    const days = Math.ceil((at - now) / 86_400_000);
    return { at, days, late: d.status !== "shipped" && days < 0 };
  };

  const reload = () => {
    designs.reload();
    orders.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production"
        description="Drag a design to the next stage. Due dates count from the order date plus the product's production days."
        actions={
          <>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order, product or colour" aria-label="Search designs" className={cn(inputCls, "w-52 pl-8")} />
            </div>
            <button type="button" onClick={reload} disabled={designs.loading} className={btn.secondary}>
              <RefreshCw size={13} className={designs.loading ? "animate-spin" : ""} /> Refresh
            </button>
          </>
        }
      />

      {designs.error && <Notice tone="danger">{designs.error}</Notice>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DESIGN_STEPS.map((step) => {
          const col = rows.filter((d) => d.status === step.id).sort((a, b) => due(a).at - due(b).at); // most urgent first
          return (
            <section
              key={step.id}
              aria-label={step.label}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverStep(step.id);
              }}
              onDragLeave={() => setOverStep((cur) => (cur === step.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const d = rows.find((x) => x.id === dragId);
                setDragId(null);
                setOverStep(null);
                if (d) move(d, step.id);
              }}
              className={cn("flex min-h-[120px] flex-col rounded-lg border bg-slate-100/60 transition-colors", overStep === step.id ? "border-[#113858] bg-[#113858]/[0.06]" : "border-slate-200")}
            >
              <header className="flex items-center justify-between px-3 py-2.5">
                <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{step.label}</h2>
                <span className="text-[12px] tabular-nums text-slate-400">{col.length}</span>
              </header>
              <ul className="flex-1 space-y-2 px-2 pb-2">
                {col.length === 0 && <li className="px-1 py-4 text-center text-[12px] text-slate-400">{designs.loading ? "Loading…" : "Nothing here"}</li>}
                {col.map((d) => {
                  const no = orderNo.get(d.medusaOrderId ?? "");
                  const dd = due(d);
                  return (
                    <li
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(d.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", d.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStep(null);
                      }}
                      className={cn("cursor-grab rounded-md border bg-white p-3 active:cursor-grabbing", dd.late ? "border-red-300" : "border-slate-200", dragId === d.id && "opacity-40")}
                    >
                      <div className="flex gap-2.5">
                        {d.preview ? <img src={d.preview} alt="" className="size-12 shrink-0 rounded border border-slate-200 object-cover" /> : <span className="size-12 shrink-0 rounded border border-dashed border-slate-300" />}
                        <div className="min-w-0 text-[12.5px]">
                          <p className="truncate font-medium text-slate-900">{getProduct(d.product)?.title ?? d.product}</p>
                          <p className="truncate text-slate-500">
                            {d.color}
                            {no ? ` · Order #${no}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[12px] text-slate-500">{d.summary}</p>
                      <p className={cn("mt-2 flex items-center gap-1 text-[12px]", dd.late ? "font-medium text-red-700" : d.status === "shipped" ? "text-slate-400" : dd.days <= 3 ? "text-amber-700" : "text-slate-500")}>
                        <CalendarClock size={12} />
                        {d.status === "shipped"
                          ? `Was due ${new Date(dd.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : dd.late
                            ? `Overdue by ${-dd.days} day${dd.days === -1 ? "" : "s"}`
                            : dd.days === 0
                              ? "Due today"
                              : `Due ${new Date(dd.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} (${dd.days} day${dd.days === 1 ? "" : "s"})`}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <GripVertical size={14} className="shrink-0 text-slate-300" aria-hidden />
                        <select value={d.status} onChange={(e) => move(d, e.target.value)} aria-label="Move to stage" className={cn(selectCls, "h-7 min-w-0 flex-1 text-[12px]")}>
                          {DESIGN_STEPS.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => download(d)} title="Download design file" aria-label="Download design file" className={cn(btn.ghost, "size-7 px-0")}>
                          <FileDown size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
