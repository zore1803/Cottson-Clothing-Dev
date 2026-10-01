import { Feather, Shirt, Sparkles, Wind } from "lucide-react";

const FEATURES = [
  { hue: "#C8426B", icon: Sparkles, label: "Super Soft", text: "Gentle on skin for all-day comfort." },
  { hue: "#0F7C8A", icon: Wind, label: "Breathable", text: "Keeps your team cool through long shifts." },
  { hue: "#6B4FA3", icon: Feather, label: "Featherlight", text: "Lightweight fabric that never feels heavy." },
  { hue: "#9A6212", icon: Shirt, label: "100% Cotton", text: "Premium cotton that lasts wash after wash." },
];

/** Fabric-quality strip: icon, label and a one-line benefit, each in its own card. */
export function FabricFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--pa,#607487)] sm:text-[12px]">The fabric</p>
        <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#113858] sm:text-[40px]">
          Made to be worn <span className="text-[#113858]/45">every day.</span>
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FEATURES.map(({ icon: Icon, label, text, hue }) => (
          <div
            key={label}
            className="group flex flex-col items-center gap-3 rounded-[24px] border px-5 py-9 text-center transition-transform duration-300 hover:-translate-y-1"
            style={{ background: `color-mix(in srgb, ${hue} 7%, #fff)`, borderColor: `color-mix(in srgb, ${hue} 20%, #fff)` }}
          >
            <span
              className="grid size-16 place-items-center rounded-full transition-colors group-hover:!bg-[var(--h)] group-hover:text-white"
              style={{ "--h": hue, background: `color-mix(in srgb, ${hue} 16%, #fff)`, color: hue } as React.CSSProperties}
            >
              <Icon className="size-7" strokeWidth={1.6} />
            </span>
            <span className="text-[17px] font-bold text-[#113858]">{label}</span>
            <span className="text-[13px] leading-relaxed text-[#607487]">{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
