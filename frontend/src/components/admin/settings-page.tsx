"use client";

import { ExternalLink } from "lucide-react";
import { DefinitionList, PageHeader, Panel, Status, btn, money } from "./ui";

export type StoreSettings = {
  region: string;
  paymentMode: string;
  shippingFee: number;
  freeShippingFrom: number;
  customizationFee: number;
  bulkTiers: { min: number; discount: number }[];
  medusaUrl: string;
  admin: { email: string; name: string };
};

// What the storefront is currently set to. Read-only: these values live in code (lib/pricing.ts)
// and in Medusa, so they are changed there and not from this screen.
export function SettingsPage({ s }: { s: StoreSettings }) {
  const payments =
    s.paymentMode === "off" ? (
      <Status tone="danger">Off, checkout is disabled</Status>
    ) : s.paymentMode === "dummy" ? (
      <Status tone="warning">Test mode (dummy Razorpay, no money is taken)</Status>
    ) : (
      <Status tone="success">{s.paymentMode}</Status>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="How the store is currently configured. Read-only." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Store">
          <DefinitionList items={[["Selling region", s.region], ["Payments", payments]]} />
        </Panel>

        <Panel title="Your account">
          <DefinitionList items={[["Name", s.admin.name || "—"], ["Email", s.admin.email], ["Role", "Admin"]]} />
        </Panel>

        <Panel title="Pricing" className="lg:col-span-2">
          <DefinitionList
            items={[
              ["Logo customization", `${money(s.customizationFee)} per customized piece`],
              ["Shipping", `${money(s.shippingFee)}, free on orders from ${money(s.freeShippingFrom)}`],
              ...[...s.bulkTiers].reverse().map((t): [string, string] => [`${t.min}+ pieces of one item`, `${Math.round(t.discount * 100)}% off`]),
            ]}
          />
          <p className="mt-3 text-[12.5px] text-slate-500">
            To change pricing, edit <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">lib/pricing.ts</code> and re-run the pricing seed so the storefront and Medusa agree.
          </p>
        </Panel>

        <Panel title="Medusa" className="lg:col-span-2">
          <p className="text-[13px] text-slate-600">Product details, shipping options, taxes and payment providers are managed in the Medusa dashboard.</p>
          <a href={`${s.medusaUrl}/app`} target="_blank" rel="noreferrer" className={`${btn.secondary} mt-3 w-fit`}>
            Open Medusa <ExternalLink size={13} />
          </a>
        </Panel>
      </div>
    </div>
  );
}
