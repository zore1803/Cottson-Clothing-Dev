import Link from "next/link";
import { Palette } from "lucide-react";
import { getProduct } from "@/lib/catalog";
import { Card, btnPrimary, type SavedDesign } from "./shared";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Saved", tone: "bg-slate-100 text-slate-600" },
  ordered: { label: "Ordered", tone: "bg-[#EAF1F7] text-[#113858]" },
  approved: { label: "Design approved", tone: "bg-[#DCEAF5] text-[#1F5A8C]" },
  in_production: { label: "In production", tone: "bg-amber-50 text-amber-700" },
  shipped: { label: "Shipped", tone: "bg-emerald-50 text-emerald-700" },
};

export function DesignsSection({ designs }: { designs: SavedDesign[] }) {
  return (
    <Card title="My designs" subtitle={designs.length ? `${designs.length} saved design${designs.length > 1 ? "s" : ""}` : undefined}>
      {designs.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {designs.map((d) => {
            const s = STATUS[d.status] ?? STATUS.pending;
            const product = getProduct(d.product);
            return (
              <div key={d.id} className="flex gap-4 rounded-2xl border border-[#113858]/10 p-4">
                {d.preview ? (
                  <img src={d.preview} alt="" className="size-24 shrink-0 rounded-xl bg-[#EAF1F7] object-cover" />
                ) : (
                  <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-[#EAF1F7] text-[#5B7690]"><Palette size={22} /></span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#0B2A45]">{product?.title ?? d.product}</p>
                  <p className="text-[13px] text-[#5B7690]">{new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${s.tone}`}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-[#113858]/20 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[#DCEAF5] text-[#113858]"><Palette size={22} /></span>
          <p className="mt-4 text-[15px] font-semibold text-[#0B2A45]">No saved designs yet</p>
          <p className="mt-1 text-[13.5px] text-[#5B7690]">Designs you add to your cart while signed in will appear here.</p>
          <Link href="/products" className={`${btnPrimary} mt-5`}>Browse products</Link>
        </div>
      )}
    </Card>
  );
}
