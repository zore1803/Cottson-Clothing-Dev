import Link from "next/link";
import Image from "next/image";
import { Check, MessageSquare } from "lucide-react";
import { COLORS } from "@/lib/catalog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuoteForm } from "@/components/quote-form";
import { ProductTabs } from "@/components/product-tabs";
import { DesignShowcase } from "@/components/design-showcase";
import { TrustTicker } from "@/components/trust-ticker";
import { NeedsGrid } from "@/components/needs-grid";
import { StatsRow } from "@/components/stats-row";
import { FaqAccordion } from "@/components/faq-accordion";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

export const revalidate = 3600; // ISR: rebuilt at most hourly, served from the CDN

export default function HomePage() {
  return (
    <>
      {/* Hero: centered headline with two product cutouts flanking it, like the storefront banner */}
      <section className="relative isolate overflow-hidden bg-background pb-14 pt-10">
        <div className="mx-auto grid max-w-5xl grid-cols-3 items-end gap-2 px-4 sm:gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
            <Image src="/products/contrast-trim-shirt/cutout.png" alt="" fill sizes="200px" unoptimized className="object-contain object-bottom" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand-accent" /> Custom corporate clothing
            </span>
          </div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
            <Image src="/products/polo-black/cutout.png" alt="" fill sizes="200px" unoptimized className="object-contain object-bottom" />
          </div>
        </div>

        <div className="relative mx-auto mt-6 max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand sm:text-5xl">
            Custom Corporate Clothing for Mumbai Companies<span className="text-brand-accent">.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
            Branded T-shirts, polos &amp; shirts for events, office staff &amp; team outings. MOQ 25 pieces.
            Delivered in 7–10 days.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-11 place-items-center rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
            >
              Talk To Our Team
            </a>
            <Link href="/products" className="grid h-11 place-items-center rounded-full border border-brand px-7 text-sm font-semibold text-brand hover:bg-muted">
              View Products
            </Link>
          </div>
        </div>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full bg-brand text-white shadow-lg hover:bg-brand/90"
        >
          <MessageSquare className="size-7" />
        </a>
      </section>

      <TrustTicker />

      {/* Your Brand. Your Colours. Your Style */}
      <section className="mx-auto max-w-7xl px-4 pt-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Your Brand. Your Colours. Your Style<span className="text-brand-accent">.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">Classic polos, custom collars and everything in between.</p>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-5">
          {[
            ["/products/classic-white-tee/photo.jpg", "Classic Crew Tee"],
            ["/products/polo-black/photo.jpg", "Essential Polo"],
            ["/products/formal-shirt-grey/photo.jpg", "Classic Formal Shirt"],
          ].map(([src, alt]) => (
            <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
              <Image src={src} alt={alt} fill sizes="(min-width: 640px) 200px, 30vw" className="object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {COLORS.map((c) => (
            <span key={c.id} title={c.name} className="size-6 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
          ))}
        </div>
      </section>

      <ProductTabs />

      {/* Trusted by 250+ companies */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="rounded-2xl border bg-muted/30 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Trusted by 250+ companies across Mumbai</p>
        </div>
      </section>

      <NeedsGrid />

      <DesignShowcase />

      <StatsRow />

      {/* Final CTA: photo on the left, message right-aligned, like the Wix layout */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-2xl bg-muted lg:order-1">
            <Image src="/products/contrast-trim-shirt/photo.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="order-1 text-right lg:order-2">
            <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              Ready To Create Your Corporate Clothing<span className="text-brand-accent">?</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Talk to our team to discuss your requirements, explore customisation options and get a tailored
              solution for your business.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-grid h-11 place-items-center rounded-full bg-brand px-8 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
            >
              Talk To Our Team
            </a>
          </div>
        </div>
      </section>

      <FaqAccordion />

      {/* Bulk pricing + quote form */}
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
