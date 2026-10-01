const FEATURES = [
  { label: "Super soft", text: "Gentle on the skin, comfortable through a full day." },
  { label: "Breathable", text: "Lets air through, so the team stays cool on long shifts." },
  { label: "Featherlight", text: "Light fabric that never feels heavy to wear." },
  { label: "100% cotton", text: "Premium cotton that holds up wash after wash." },
];

/** Fabric qualities: four short columns, each under its own rule. */
export function FabricFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#113858] sm:text-[32px]">The fabric</h2>
        <p className="max-w-lg text-[16px] leading-relaxed text-[#607487] lg:pt-1.5">
          What your team notices first when they put it on: how it feels, how it breathes and how long it lasts.
        </p>
      </div>
      <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ label, text }) => (
          <li key={label} className="border-t-2 border-[#113858] pt-5">
            <p className="text-[20px] font-bold tracking-[-0.01em] text-[#113858]">{label}</p>
            <p className="mt-3 text-[15px] leading-[1.7] text-[#607487]">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
