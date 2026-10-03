import { Eye, Target } from "lucide-react";

const ITEMS = [
  {
    icon: Eye,
    title: "Our Vision",
    body: "To be the go-to name for teams across India who want clothing that actually feels like theirs — quality cotton, their colors, their logo, no compromises.",
  },
  {
    icon: Target,
    title: "Our Mission",
    body: "Make custom, premium cotton apparel accessible from a single piece to a bulk order — with fast turnarounds, fair pricing and a design process anyone can use.",
  },
] as const;

/** Placeholder imagery alongside each statement — swap for real studio/product photography once available. */
export function VisionMission() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-10 sm:grid-cols-2 sm:gap-8">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <div className="flex aspect-4/3 items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-muted-foreground">
              <Icon className="size-12" strokeWidth={1.5} />
            </div>
            <h3 className="mt-5 text-xl font-bold text-brand">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
