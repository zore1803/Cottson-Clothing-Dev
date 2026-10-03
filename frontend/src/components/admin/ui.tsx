"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "./types";

// Small, quiet UI kit for the admin: neutral surfaces, 1px borders, 6-8px radii, one accent colour.
// Nothing here is decorative; colour is reserved for state.

export const accent = "#113858";

export const inputCls =
  "h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#113858] focus:ring-2 focus:ring-[#113858]/15 disabled:bg-slate-50 disabled:text-slate-400";
export const selectCls = cn(inputCls, "pr-7");

const btnBase = "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#113858]/30 disabled:pointer-events-none disabled:opacity-50";
export const btn = {
  primary: cn(btnBase, "bg-[#113858] text-white hover:bg-[#0d2c47]"),
  secondary: cn(btnBase, "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"),
  ghost: cn(btnBase, "text-slate-600 hover:bg-slate-100"),
};

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-7 tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, flush }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          {title && <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

const dot: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info: "bg-sky-600",
  success: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-red-600",
};

/** State shown as a coloured dot and plain text, not a pill */
export function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-700">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot[tone])} />
      {children}
    </span>
  );
}

/** Row of mutually exclusive filters with counts */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-300 bg-slate-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-7 shrink-0 rounded px-2.5 text-[12.5px] font-medium transition", value === o.id ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "text-slate-500 hover:text-slate-800")}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 tabular-nums text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Table building blocks
export const table = "w-full border-collapse text-left text-[13px]";
export const th = "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-slate-500";
export const td = "border-b border-slate-100 px-4 py-2.5 align-middle text-slate-700";
export const rowHover = "transition-colors hover:bg-slate-50/80";

export function TableEmpty({ cols, loading, children }: { cols: number; loading: boolean; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-[13px] text-slate-500">
        {loading ? "Loading…" : children}
      </td>
    </tr>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "danger"; children: React.ReactNode }) {
  return <div className={cn("rounded-md border px-3 py-2 text-[13px]", tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600")}>{children}</div>;
}

export function DefinitionList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100 text-[13px]">
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[150px_1fr] gap-3 py-2.5">
          <dt className="text-slate-500">{k}</dt>
          <dd className="min-w-0 text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-hand detail panel for a selected row */
export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-xl outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const shortDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const dateTime = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
