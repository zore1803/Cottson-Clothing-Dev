const LOGOS = Array.from({ length: 8 }, (_, i) => i);

/** Placeholder client-logo strip — swap each tile for a real logo <Image> once clients approve usage. */
export function ClientLogosMarquee() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">Brands That Trust Us</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          A few of the teams we've kitted out.
        </p>
      </div>

      <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-6 hover:[animation-play-state:paused]">
          {[...LOGOS, ...LOGOS].map((i, idx) => (
            <div
              key={idx}
              className="flex h-20 w-40 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm font-semibold text-muted-foreground"
            >
              Client {i + 1}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
