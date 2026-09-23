import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare, Palette, Shirt, Truck, Users } from "lucide-react";
import { PRODUCTS, COLORS } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";
import { UseCases } from "@/components/use-cases";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero: a white card sits over a full-bleed photo, like a storefront window display */}
      <section className="relative isolate min-h-[640px] overflow-hidden bg-[#b9bcc2]">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16">
          <div className="max-w-[500px] rounded-b-2xl bg-background px-5 pb-11 pt-11 shadow-2xl sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand-accent" /> Custom cotton clothing
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-brand sm:text-5xl">
              Your team.
              <br />
              Your colors.
              <br />
              Our cotton<span className="text-brand-accent">.</span>
            </h1>
            <ul className="mt-7 grid gap-x-5 gap-y-3 text-sm font-semibold sm:grid-cols-2">
              {["Premium cotton", "Any color, any logo", "Live design studio", "Bulk pricing from 25", "Made to order", "Delivered in 7–10 days"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-3.5 shrink-0 text-brand" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              <Link href="/studio" className="grid h-12 place-items-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm hover:bg-brand/90">
                Talk to us
              </Link>
              <Link href="/products" className="grid h-12 place-items-center rounded-md bg-muted text-sm font-semibold text-brand hover:bg-muted/70">
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

        {/* Floating second product photo, standing on the ground at the bottom of the hero */}
        <Link
          href="/products/polo-black"
          className="absolute bottom-0 right-8 hidden h-[560px] w-[420px] transition-transform hover:scale-[1.02] lg:block"
        >
          <Image
            src="/products/polo-black/cutout.png"
            alt="Model wearing a COTTSON essential polo"
            fill
            sizes="420px"
            unoptimized
            className="object-contain object-bottom"
          />
        </Link>

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

      {/* Design Studio promo */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="grid overflow-hidden rounded-2xl border bg-[#c7ddd3] sm:grid-cols-2">
          <div className="flex flex-col justify-center px-8 py-5 sm:px-12">
            <h2 className="text-xl font-bold leading-tight tracking-tight text-brand sm:text-2xl">
              Instant designs with Design Studio<span className="text-brand-accent">.</span>
            </h2>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground sm:text-sm">
              Your live DIY tool for creating branded merch in real time. Try it out and see your logo on the fabric instantly.
            </p>
            <Link href="/studio" className="mt-4 inline-flex h-9 w-fit items-center rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90">
              Try it now
            </Link>
          </div>
          <div className="grid h-64 grid-cols-2 gap-1 p-1 [clip-path:polygon(15%_0,100%_0,100%_100%,0_100%)] sm:h-72 sm:[clip-path:polygon(20%_0,100%_0,100%_100%,0_100%)]">
            {[
              ["/products/polo-black/photo.jpg", "Essential Polo"],
              ["/products/contrast-trim-shirt/photo.jpg", "Contrast Trim Shirt"],
              ["/products/classic-white-tee/photo.jpg", "Classic Crew Tee"],
              ["/products/formal-shirt-grey/photo.jpg", "Classic Formal Shirt"],
            ].map(([src, alt]) => (
              <div key={src} className="relative overflow-hidden">
                <Image src={src} alt={alt} fill sizes="200px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One solution for all your needs */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          One solution for all your needs<span className="text-brand-accent">.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Make merchandising simple, by centralizing the entire process through us — from design and fabric selection,
          to bulk production, quality checks and delivery. We&apos;re with you all the way.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Palette, border: "border-l-blue-400", title: "Tailored garments.", text: "Say goodbye to generic sizing. Design unique pieces that truly represent your brand.", href: "/studio" },
            { Icon: Truck, border: "border-l-amber-400", title: "Pan-India delivery.", text: "No storage or shipping headaches. We make, pack and ship your order in 7–10 days.", href: "/#how" },
            { Icon: Users, border: "border-l-brand", title: "Bulk order pricing.", text: "Mix sizes and colors in one order, with automatic discounts from 25 pieces.", href: "/#bulk" },
            { Icon: Shirt, border: "border-l-rose-400", title: "Premium cotton.", text: "Every piece is made to order from pure, breathable cotton — built to last.", href: "/products" },
          ].map(({ Icon, border, title, text, href }) => (
            <div key={title} className="rounded-2xl bg-muted/40 p-6">
              <span className="grid size-12 place-items-center rounded-full bg-background text-brand">
                <Icon className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className={cn("mt-5 border-l-4 pl-3 text-lg font-semibold text-brand", border)}>{title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{text}</p>
              <Link href={href} className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                Learn more
              </Link>
            </div>
          ))}
        </div>
      </section>

      <UseCases />

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
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
