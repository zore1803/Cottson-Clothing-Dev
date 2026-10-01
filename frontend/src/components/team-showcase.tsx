import Image from "next/image";

const WIDE_TOP = { src: "/cw1.png", w: 876, h: 241, alt: "A corporate team wearing matching navy COTTSON polos at an exhibition" };
const GRID = [
  { src: "/cw3.png", w: 564, h: 423, alt: "A team in navy COTTSON polos standing together in a hotel lobby" },
  { src: "/cw4.png", w: 594, h: 423, alt: "A group of colleagues in COTTSON corporate uniforms" },
  { src: "/cw5.png", w: 565, h: 423, alt: "A company team photographed in COTTSON uniforms" },
];
const WIDE_BOTTOM = { src: "/cw2.png", w: 800, h: 220, alt: "A large team wearing COTTSON corporate polos" };

function Photo({ src, w, h, alt, sizes }: { src: string; w: number; h: number; alt: string; sizes: string }) {
  return (
    <div className="overflow-hidden rounded-[24px] bg-[#E9F0F5]">
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        sizes={sizes}
        className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
      />
    </div>
  );
}

/** Real group photos of teams wearing COTTSON uniforms. */
export function TeamShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--pa,#607487)] sm:text-[12px]">
          Our clients
        </p>
        <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#113858] sm:text-[40px]">
          Trusted by teams <span className="text-[#113858]/45">like yours.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#607487]">
          From office staff to event crews — see how teams wear COTTSON.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        <Photo {...WIDE_TOP} sizes="(min-width: 1152px) 1120px, 100vw" />
        <div className="grid gap-4 sm:grid-cols-3">
          {GRID.map((p) => (
            <Photo key={p.src} {...p} sizes="(min-width: 1152px) 365px, (min-width: 640px) 33vw, 100vw" />
          ))}
        </div>
        <Photo {...WIDE_BOTTOM} sizes="(min-width: 1152px) 1120px, 100vw" />
      </div>
    </section>
  );
}
