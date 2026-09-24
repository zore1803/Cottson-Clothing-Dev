import type { Metadata } from "next";
import { MockupCustomizer } from "@/components/mockup-customizer";
import { MockupLiveCustomizer } from "@/components/mockup-live-customizer";

export const metadata: Metadata = { title: "Mockup" };

export default function MockupPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-brand">Mockup</h1>
      <p className="mt-2 text-muted-foreground">Pick a product and customize its trim color.</p>

      <div className="mt-10">
        <MockupCustomizer />
      </div>

      <div className="mt-20 border-t pt-10">
        <h2 className="text-xl font-semibold text-brand">Experiment: live trim color</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Instead of swapping between fixed photos, this recolors the actual trim pixels in real time —
          any color, not just the 5 above.
        </p>
        <div className="mt-6">
          <MockupLiveCustomizer />
        </div>
      </div>
    </div>
  );
}
