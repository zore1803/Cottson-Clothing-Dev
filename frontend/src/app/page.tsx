import Link from "next/link";
import Image from "next/image";
import { ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { NeedsGrid } from "@/components/needs-grid";
import { DesignShowcase } from "@/components/design-showcase";
import { StatsRow } from "@/components/stats-row";
import { FaqAccordion } from "@/components/faq-accordion";

const CLIENTS = [
  "OMS", "Morgan Stanley", "Mullenlowe Lintas Group", "NDTS India", "Aurum", "Western", "Hoshizaki",
  "Antony Waste", "Chemco", "Lupin", "Uniclan Healthcare", "Glocutis Healthcare", "Essens Renewable",
  "Supreme Allied Services", "Tubestar", "Dry Chem", "Walplast", "Aurum PropTech",
];

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

function ImageSlot({ className }: { className?: string }) {
  return (
    <div className={`grid place-items-center rounded-2xl border-2 border-dashed bg-muted text-muted-foreground ${className ?? ""}`}>
      <ImageIcon className="size-6" strokeWidth={1.5} />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero: headline centered between two flanking product photos (added later) */}
      <section className="relative isolate overflow-hidden bg-background pb-14 pt-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto grid max-w-xs grid-cols-2 gap-3 sm:hidden">
            <ImageSlot className="aspect-[3/4] w-full" />
            <ImageSlot className="aspect-[3/4] w-full" />
          </div>

          <div className="flex items-center justify-center gap-6 sm:justify-between">
            <ImageSlot className="hidden aspect-[3/4] w-[180px] shrink-0 sm:grid" />

            <div className="mt-6 w-full max-w-3xl text-center sm:mt-0">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand sm:text-5xl">
                Custom Corporate Clothing
                <br />
                for Mumbai Companies<span className="text-brand-accent">.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
                Branded T-shirts, polos &amp; shirts for events, office staff &amp; team outings.
                <br /> MOQ 25 pieces. Delivered in 7–10 days.
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

            <div className="relative hidden aspect-[3/4] w-[180px] shrink-0 overflow-hidden rounded-2xl bg-muted sm:block">
              <Image src="/shirt1.png" alt="COTTSON shirt" fill sizes="180px" className="object-cover" />
            </div>
          </div>

          <ImageSlot className="mx-auto mt-8 aspect-[4/3] h-[180px] rotate-180" />
        </div>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-6 z-50 grid size-16 place-items-center rounded-full shadow-lg hover:opacity-90"
        >
          <Image src="/whatsapp.png" alt="WhatsApp" width={64} height={64} className="size-16" />
        </a>
      </section>

      {/* Your Brand. Your Colours. Your Style — garment photos go in later */}
      <section className="mx-auto max-w-7xl px-4 pt-32 text-center">
        <h2 className="mt-8 text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Your Brand. Your Colours. Your Style
        </h2>
        <p className="mt-3 text-muted-foreground">Classic polos, custom collars and everything in between.</p>

        <div className="relative mt-8">
          <button
            type="button"
            aria-label="Previous"
            className="absolute -left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
            {Array.from({ length: 7 }).map((_, i) => (
              <ImageSlot key={i} className="aspect-[3/4] w-40 shrink-0 snap-start sm:w-44" />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            className="absolute -right-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Real Teams. Real Events. Real Cottson. — two scrollable rows of client/event photos (added later) */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-brand sm:text-4xl">
          Real Teams. Real Events. Real Cottson.
        </h2>
        <p className="mt-3 text-center text-muted-foreground">Trusted by Mumbai&apos;s leading companies.</p>

        <div className="mt-8 space-y-3">
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
              {Array.from({ length: 5 }).map((_, i) => (
                <ImageSlot key={i} className="aspect-[4/3] w-64 shrink-0 sm:w-72" />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* T-Shirts, Polos & Shirts for Your Team — logo mark + product carousel (added later) */}
      <section className="mx-auto max-w-7xl px-4 pt-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border-2 border-dashed text-muted-foreground">
          <ImageIcon className="size-6" strokeWidth={1.5} />
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-brand sm:text-4xl">T-Shirts, Polos &amp; Shirts for Your Team</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Built for corporate events, office staff and team outings. Find your fabric and order a free swatch before
          you commit.
        </p>

        <div className="relative mt-10">
          <button
            type="button"
            aria-label="Previous"
            className="absolute -left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 py-1 text-left [scrollbar-width:none]">
            {["Edge", "Stride", "Cosmo", "Evolve", "Elite", "Prime"].map((name, i) => (
              <div key={name} className="relative w-52 shrink-0 snap-start">
                {i === 4 && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-brand-accent px-2.5 py-1 text-[11px] font-semibold text-white">
                    Best Seller
                  </span>
                )}
                <ImageSlot className="aspect-[3/4] w-full" />
                <p className="mt-3 text-sm font-medium text-brand">{name} - Full Sleeve Formal Shirt</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            className="absolute -right-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Trusted by 250+ companies across Mumbai — client word-marks (logos to come later) */}
      <section className="mx-auto max-w-7xl px-4 pt-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">Trusted by 250+ companies across Mumbai</h2>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
          {CLIENTS.map((name) => (
            <div key={name} className="text-sm font-semibold text-muted-foreground">
              {name}
            </div>
          ))}
        </div>
      </section>

      <NeedsGrid />

      <DesignShowcase />

      <StatsRow />

      {/* Ready To Create Your Corporate Clothing? — garment rack photo (added later) + CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl border lg:grid-cols-2">
          <ImageSlot className="aspect-[4/3] rounded-none border-0 lg:aspect-auto lg:h-full" />
          <div className="px-6 py-10 text-center sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">Ready To Create Your Corporate Clothing?</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
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
    </>
  );
}
