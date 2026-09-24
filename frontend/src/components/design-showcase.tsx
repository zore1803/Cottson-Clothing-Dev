import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Ruler, Palette, Layers, FileImage, MessageSquareText, PackageCheck } from "lucide-react";

const POINTS = [
  { title: "Top quality cotton", text: "Every piece is cut from premium, breathable fabric." },
  { title: "Endless design options", text: "Colors, logo placement, sizing and trims — all yours to pick." },
  { title: "Dyed to your exact brand color", text: "We match your palette, not the other way around." },
];

const PANEL = [
  { Icon: Ruler, label: "Sizes" },
  { Icon: Palette, label: "Colors" },
  { Icon: Layers, label: "Add-ons" },
  { Icon: FileImage, label: "Files" },
];

export function DesignShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div className="grid items-center gap-10 overflow-hidden rounded-2xl border bg-muted/20 p-8 lg:grid-cols-2 lg:p-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
            Design Before Production<span className="text-brand-accent">.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Use our Design Studio to visualise your corporate t-shirts and uniforms before production begins. Create,
            review and refine your designs, check logo placement and colours, and get clarity before moving to
            sampling and manufacturing. This reduces errors, speeds up approvals and ensures your final product
            matches your expectations.
          </p>
          <ul className="mt-6 space-y-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
                <div>
                  <div className="font-semibold text-brand">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.text}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/studio"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-brand px-6 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
          >
            See how it works
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2">
              {["#0f766e", "#84cc16", "#a78bfa", "#94a3b8"].map((hex) => (
                <span key={hex} className="size-6 rounded-full ring-1 ring-border" style={{ background: hex }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1">
              {PANEL.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs font-medium">
                  <Icon className="size-3.5 text-brand" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <Image src="/products/polo-black/photo.jpg" alt="Custom-colored COTTSON polo" fill sizes="220px" className="object-cover" />
          </div>

          <div className="flex flex-col justify-between rounded-xl border bg-background p-4 shadow-sm">
            <MessageSquareText className="size-5 text-brand" />
            <div>
              <div className="text-xs font-semibold text-brand">Talk to our design team</div>
              <p className="mt-1 text-xs text-muted-foreground">Logo, colors and sampling — sorted over chat.</p>
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-3 rounded-xl border bg-background p-4 shadow-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
              <PackageCheck className="size-4 text-brand" />
            </span>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-brand">Sample before you commit.</span> Approve a physical sample
              before we run your full order.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
