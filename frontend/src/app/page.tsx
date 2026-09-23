import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare, Palette, Shirt, Truck, Users } from "lucide-react";
import { PRODUCTS, COLORS } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero: a white card sits over a full-bleed photo, like a storefront window display */}
      <section className="relative isolate min-h-[640px] overflow-hidden bg-[#b9bcc2]">
        <Image
          src="/products/polo-black/photo.jpg"
          alt="Model wearing a COTTSON polo"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[62%_12%]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16">
          <div className="max-w-[460px] rounded-b-2xl bg-background px-5 pb-6 pt-7 shadow-2xl sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand-accent" /> Custom cotton clothing
            </span>
            <h1 className="mt-3 text-3xl font-bold leading-[1.05] tracking-tight text-brand sm:text-4xl">
              Your team.
              <br />
              Your colors.
              <br />
              Our cotton<span className="text-brand-accent">.</span>
            </h1>
            <ul className="mt-4 grid gap-x-5 gap-y-1.5 text-sm font-semibold sm:grid-cols-2">
              {["Premium cotton", "Any color, any logo", "Live design studio", "Bulk pricing from 25", "Made to order", "Delivered in 7–10 days"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-3.5 shrink-0 text-brand" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href="/studio" className="grid h-10 place-items-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm hover:bg-brand/90">
                Talk to us
              </Link>
              <Link href="/products" className="grid h-10 place-items-center rounded-md bg-muted text-sm font-semibold text-brand hover:bg-muted/70">
                Browse catalog
              </Link>
            </div>
          </div>

          {/* Small badge card, peeking out below the main card like a certification tag */}
          <div className="mt-6 inline-flex items-center gap-4 rounded-2xl bg-background px-6 py-4 shadow-lg">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-brand text-xs font-bold text-brand">
              100%
            </span>
            <div>
              <div className="text-lg font-semibold text-brand">Pure cotton</div>
              <div className="text-sm text-muted-foreground">Designed and made in India</div>
            </div>
          </div>
        </div>

        <Link
          href="/#bulk"
          aria-label="Chat with us"
          className="fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full bg-brand text-white shadow-lg hover:bg-brand/90"
        >
          <MessageSquare className="size-7" />
        </Link>
      </section>

      {/* Color strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-6">
          <span className="mr-2 text-sm text-muted-foreground">{COLORS.length} colors in stock:</span>
          {COLORS.map((c) => (
            <span key={c.id} title={c.name} className="size-6 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold tracking-tight">Bestsellers</h2>
          <Link href="/products" className="text-sm font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            [Shirt, "Pick a product", "Shirts and polos in premium cotton."],
            [Palette, "Choose any color", "See it on the real garment, folds and all."],
            [Users, "Add your logo", "Upload your artwork, place and size it."],
            [Truck, "We make & ship", "Printed or embroidered, delivered in 7–10 days."],
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof Shirt;
            return (
              <div key={i} className="rounded-2xl border p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-muted">
                    <I className="size-5" />
                  </span>
                  <span className="text-sm text-muted-foreground">Step {i + 1}</span>
                </div>
                <div className="mt-4 font-medium">{title as string}</div>
                <p className="mt-1 text-sm text-muted-foreground">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bulk */}
      <section id="bulk" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-foreground p-10 text-background lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Uniforms and merch for your team</h2>
            <p className="mt-4 max-w-md opacity-80">
              Order 25+ pieces and save up to 20%. Mix sizes and colors in one order, with your logo embroidered or printed.
            </p>
            <div className="mt-6 grid max-w-sm grid-cols-3 gap-3 text-center">
              {[["25+", "10% off"], ["50+", "15% off"], ["100+", "20% off"]].map(([q, d]) => (
                <div key={q} className="rounded-xl bg-background/10 p-3">
                  <div className="text-xl font-semibold">{q}</div>
                  <div className="text-xs opacity-80">{d}</div>
                </div>
              ))}
            </div>
            <Link href="/studio" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-8 h-11 px-6")}>
              Design for your team
            </Link>
          </div>
          <QuoteForm />
        </div>
      </section>
    </>
  );
}
