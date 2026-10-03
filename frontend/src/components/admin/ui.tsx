import { cn } from "@/lib/utils";

// Shared look for the admin sections
export const selectCls = "h-9 rounded-lg border border-[#113858]/15 bg-white px-2.5 text-[13px] font-medium text-[#113858] outline-none focus:border-[#113858]";
export const cardCls = "rounded-2xl border border-[#113858]/[0.08] bg-white p-5 shadow-[0_8px_30px_rgba(17,56,88,0.06)] sm:p-6";
export const inputCls = "h-9 rounded-lg border border-[#113858]/15 bg-white px-3 text-[13px] text-[#113858] outline-none placeholder:text-[#5B7690]/60 focus:border-[#113858]";

export function Pill({ children, tone = "bg-[#EAF1F7] text-[#113858]" }: { children: React.ReactNode; tone?: string }) {
  return <span className={cn("inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", tone)}>{children}</span>;
}

export type AdminCall = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;
