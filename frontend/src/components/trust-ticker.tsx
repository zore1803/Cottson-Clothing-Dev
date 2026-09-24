const ITEMS = [
  "Branded T-shirts, polos & shirts",
  "For events, office staff & team outings",
  "MOQ 25 pieces",
  "Delivered in 7–10 days",
  "Serving Mumbai, Thane & Navi Mumbai",
];

export function TrustTicker() {
  return (
    <div className="border-y bg-brand text-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-center text-xs font-medium sm:text-sm">
        {ITEMS.map((t, i) => (
          <span key={t} className="flex items-center gap-2">
            {i > 0 && <span className="opacity-50">•</span>}
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
