const STATS = [
  ["250+", "Businesses Served"],
  ["7–10 Days", "Delivery"],
  ["8K+", "Pieces Production Capacity"],
  ["25 Pieces", "Minimum Order Quantity"],
];

export function StatsRow() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <h2 className="text-center text-2xl font-bold tracking-tight text-brand sm:text-3xl">
        Trusted By Businesses Across India<span className="text-brand-accent">.</span>
      </h2>
      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map(([value, label]) => (
          <div key={label} className="rounded-2xl border p-6 text-center">
            <div className="text-3xl font-bold text-brand">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
