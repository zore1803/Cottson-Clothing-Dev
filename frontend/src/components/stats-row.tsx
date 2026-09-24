import { Building2, Truck, Layers, Briefcase } from "lucide-react";

const STATS = [
  [Building2, "250+", "Businesses Served"],
  [Truck, "7–10 Days", "Delivery"],
  [Layers, "8K+", "Pieces Production Capacity"],
  [Briefcase, "25 Pieces", "Minimum Order Quantity"],
] as const;

export function StatsRow() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <h2 className="text-center text-2xl font-bold tracking-tight text-brand sm:text-3xl">
        Trusted By Businesses Across India
      </h2>
      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map(([Icon, value, label]) => (
          <div key={label} className="rounded-2xl border bg-muted/30 p-6 text-center">
            <Icon className="mx-auto size-8 text-brand" strokeWidth={1.5} />
            <div className="mt-4 text-xl font-bold text-brand">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
