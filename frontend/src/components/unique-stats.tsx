import { Award, Clock, Palette, Users } from "lucide-react";

const STATS = [
  [Users, "250+", "Businesses Served"],
  [Palette, "40+", "Colors & Fabrics"],
  [Clock, "7–10 Days", "Turnaround Time"],
  [Award, "100%", "Cotton, No Compromise"],
] as const;

export function UniqueStats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">What Makes Us Unique</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          The numbers behind every order we ship.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
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
