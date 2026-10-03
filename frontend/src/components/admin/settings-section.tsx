import { ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/catalog";
import { Pill, cardCls } from "./ui";

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#113858]/[0.07] py-3 text-[14px] last:border-0">
      <span className="text-[#5B7690]">{label}</span>
      <span className="text-right font-medium text-[#0B2A45]">{children}</span>
    </div>
  );
}

const PAYMENT: Record<string, { label: string; tone: string }> = {
  dummy: { label: "Test mode (dummy Razorpay)", tone: "bg-amber-50 text-amber-700" },
  off: { label: "Off", tone: "bg-red-50 text-red-700" },
};

// What the storefront is currently set to. Read-only for now: these values live in code
// (lib/pricing.ts) and in Medusa, so they are changed there and not from this screen.
export function SettingsSection({ s }: { s: StoreSettings }) {
  const pay = PAYMENT[s.paymentMode] ?? { label: s.paymentMode, tone: "bg-[#EAF1F7] text-[#113858]" };
  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <h2 className="text-[17px] font-semibold text-[#0B2A45]">Store</h2>
        <div className="mt-2">
          <Row label="Selling region">{s.region}</Row>
          <Row label="Payments"><Pill tone={pay.tone}>{pay.label}</Pill></Row>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-[17px] font-semibold text-[#0B2A45]">Pricing rules</h2>
        <p className="text-[13px] text-[#5B7690]">What customers are charged. Medusa applies these at checkout.</p>
        <div className="mt-2">
          <Row label="Logo customization">{formatPrice(s.customizationFee)} per customized piece</Row>
          <Row label="Shipping">{formatPrice(s.shippingFee)}, free from {formatPrice(s.freeShippingFrom)}</Row>
          {[...s.bulkTiers].reverse().map((t) => (
            <Row key={t.min} label={`Bulk discount, ${t.min}+ pieces of one item`}>{Math.round(t.discount * 100)}% off</Row>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-[#5B7690]">To change these, edit <code>lib/pricing.ts</code> and re-run the pricing seed so both match.</p>
      </div>

      <div className={cardCls}>
        <h2 className="text-[17px] font-semibold text-[#0B2A45]">Your account</h2>
        <div className="mt-2">
          <Row label="Signed in as">{s.admin.name ? `${s.admin.name} · ` : ""}{s.admin.email}</Row>
          <Row label="Role">Admin</Row>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-[17px] font-semibold text-[#0B2A45]">Medusa dashboard</h2>
        <p className="text-[14px] text-[#35516B]">Product details, shipping options, taxes and payment providers are managed in Medusa.</p>
        <a href={`${s.medusaUrl}/app`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1F5A8C] hover:underline">
          Open Medusa <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
