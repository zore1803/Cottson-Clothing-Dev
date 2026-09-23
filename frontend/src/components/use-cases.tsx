"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CASES = [
  {
    label: "Onboarding",
    title: "Onboarding.",
    text: "Welcome new hires with a branded kit. Create a memorable first day, every time.",
    points: [
      "Design a welcome tee or polo tailored to your brand",
      "Order in bulk once, sized and boxed per employee",
      "Reorder in minutes as your team grows",
    ],
    image: "/products/polo-black/photo.jpg",
  },
  {
    label: "Events",
    title: "Events & conferences.",
    text: "Get every crew member and volunteer into the same branded look, fast.",
    points: [
      "One design, printed or embroidered across every size",
      "Mix colors for staff, speakers and volunteers",
      "Delivered in 7–10 days, even for large headcounts",
    ],
    image: "/products/contrast-trim-shirt/photo.jpg",
  },
  {
    label: "Client gifts",
    title: "Client gifts.",
    text: "A well-made, well-branded shirt says more than a mug ever will.",
    points: [
      "Premium cotton with your logo, not a generic giveaway",
      "Small runs from a single piece — no minimums for gifting",
      "Ship directly to one address or many",
    ],
    image: "/products/classic-white-tee/photo.jpg",
  },
  {
    label: "Uniforms",
    title: "Corporate uniforms.",
    text: "Consistent, comfortable teamwear that holds up to daily wear.",
    points: [
      "Any color, any logo, across formal shirts to polos",
      "Bulk pricing kicks in automatically from 25 pieces",
      "Made to order, so sizing stays consistent every time",
    ],
    image: "/products/formal-shirt-grey/photo.jpg",
  },
];

export function UseCases() {
  const [active, setActive] = useState(0);
  const c = CASES[active];

  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
        One solution for any use case<span className="text-brand-accent">.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        From day-one onboarding kits to full corporate uniform rollouts, COTTSON handles the design, production and
        delivery — so you don&apos;t have to juggle a factory, a printer and a courier.
      </p>

      <div className="mt-8 flex flex-wrap gap-1 border-b">
        {CASES.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              i === active ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-brand"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-bold text-brand">
            {c.title.replace(".", "")}
            <span className="text-brand-accent">.</span>
          </h3>
          <p className="mt-3 text-muted-foreground">{c.text}</p>
          <ul className="mt-5 space-y-2.5">
            {c.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm font-medium">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={3} />
                {p}
              </li>
            ))}
          </ul>
          <Link href="/#bulk" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
            Talk to us about {c.label.toLowerCase()} →
          </Link>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <Image src={c.image} alt={c.title} fill sizes="600px" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
