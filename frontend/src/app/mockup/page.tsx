import type { Metadata } from "next";
import { MockupLiveCustomizer } from "@/components/mockup-live-customizer";

export const metadata: Metadata = { title: "Mockup" };

export default function MockupPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-brand">Mockup</h1>
      <p className="mt-2 text-muted-foreground">Pick a product and customize its trim color.</p>

      <div className="mt-10">
        <MockupLiveCustomizer />
      </div>
    </div>
  );
}
