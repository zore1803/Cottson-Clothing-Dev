"use client";

import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Package, Printer } from "lucide-react";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type Receipt = {
  orderNo: number;
  /** 15-character public reference (lib/order-ref.ts); this is what the customer sees and quotes */
  orderRef: string;
  placedAt: string; // ISO
  paymentId?: string;
  method?: string;
  test: boolean;
  customer: { name: string; email: string; phone: string; address: string; city: string; pincode: string };
  items: { title: string; variant: string; qty: number; unit: number; customized: boolean }[];
  subtotal: number;
  bulkDiscount: number;
  shipping: number;
  total: number;
  /** Set when shown from the account's order history instead of right after paying */
  detail?: { status: string; tone: string; steps?: TimelineStep[] };
};

export type TimelineStep = { label: string; hint: string; done: boolean; at?: string };

function Timeline({ steps }: { steps: TimelineStep[] }) {
  const current = steps.findIndex((s) => !s.done); // the step in progress; -1 once everything is done
  return (
    <ol className="no-print mt-6 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-4 sm:gap-2">
      {steps.map((s, n) => {
        const active = n === current;
        return (
          <li key={s.label} className="relative flex gap-3 sm:block sm:text-center">
            {n > 0 && <span aria-hidden className={cn("absolute hidden h-0.5 sm:block", "right-1/2 top-[15px] w-full", steps[n - 1].done ? "bg-emerald-500" : "bg-slate-200")} />}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-[12px] font-semibold sm:mx-auto",
                s.done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-[#113858] bg-white text-[#113858]" : "border-slate-200 bg-white text-slate-400"
              )}
            >
              {s.done ? <Check size={15} strokeWidth={3} /> : n + 1}
            </span>
            <div className="sm:mt-2">
              <p className={cn("text-[13.5px] font-semibold", s.done || active ? "text-slate-900" : "text-slate-400")}>{s.label}</p>
              <p className="text-[12px] text-slate-500">{s.done && s.at ? s.at : active ? s.hint : s.done ? "Done" : "Pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const METHODS: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI", paylater: "Pay later" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Printing: a copy of the receipt is put straight under <body> (#print-root) and the print stylesheet removes
// everything else, so the printout has no blank pages, real page margins, and keeps the header's colours
const PRINT_CSS = `@media print {
  @page { size: A4; margin: 14mm; }
  body > *:not(#print-root) { display: none !important; }
  #print-root { display: block !important; }
  #print-root, #print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #print-root article { margin: 0 !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; break-inside: avoid; }
}`;

function printReceipt() {
  const source = document.getElementById("order-receipt");
  if (!source) return window.print();
  const root = document.createElement("div");
  root.id = "print-root";
  const copy = source.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  root.appendChild(copy);
  document.body.appendChild(root);
  const done = () => {
    root.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-[14px] font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function OrderReceipt({ r }: { r: Receipt }) {
  const pieces = r.items.reduce((n, i) => n + i.qty, 0);
  const method = r.method ? METHODS[r.method] ?? r.method : r.test ? "Test payment" : "Razorpay";
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:pt-32">
      <style>{PRINT_CSS}</style>

      {r.detail ? (
        <div className="no-print">
          <Link href="/account?tab=orders" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft size={15} /> Back to my orders
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="break-all text-2xl font-semibold tracking-[0.06em] sm:text-3xl">Order {r.orderRef}</h1>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${r.detail.tone}`}>{r.detail.status}</span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Placed {when(r.placedAt)} · {pieces} piece{pieces === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <div className="no-print text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={30} />
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Thank you, your order is confirmed</h1>
          <p className="mt-2 text-muted-foreground">
            Order <strong className="break-all tracking-[0.06em] text-foreground">{r.orderRef}</strong>
            <br className="sm:hidden" /> <span className="hidden sm:inline">·</span> {pieces} piece{pieces === 1 ? "" : "s"} · {formatPrice(r.total)}
          </p>
        </div>
      )}

      {r.detail?.steps && <Timeline steps={r.detail.steps} />}

      <article id="order-receipt" className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-[#113858] px-6 py-5 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">COTTSON Clothing</p>
            <h2 className="mt-0.5 text-xl font-semibold">Order receipt</h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Order ID</p>
            <p className="mt-0.5 break-all font-mono text-[22px] font-semibold leading-tight tracking-[0.1em] sm:text-2xl">{r.orderRef}</p>
          </div>
        </header>

        <div className="p-6">
          <dl className="grid gap-5 sm:grid-cols-4">
            <Detail label="Date" value={when(r.placedAt)} />
            <Detail
              label="Payment"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">Paid</span>
                  {method}
                </span>
              }
            />
            <Detail label="Payment ID" value={r.paymentId ?? "—"} />
            <Detail label="Amount paid" value={formatPrice(r.total)} />
          </dl>

          <div className="mt-6 grid gap-6 border-t pt-6 sm:grid-cols-2">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Shipping to</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
                <strong>{r.customer.name}</strong>
                <br />
                {r.customer.address}
                <br />
                {r.customer.city} {r.customer.pincode}
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Contact</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
                {r.customer.email}
                <br />
                {r.customer.phone}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border-t pt-6">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="pb-3 font-semibold">Item</th>
                  <th className="pb-3 text-right font-semibold">Qty</th>
                  <th className="pb-3 text-right font-semibold">Price</th>
                  <th className="pb-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.items.map((i, n) => (
                  <tr key={n}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{i.title}</p>
                      <p className="text-[12.5px] text-slate-500">
                        {i.variant}
                        {i.customized && " · incl. logo customization"}
                      </p>
                    </td>
                    <td className="py-3 text-right tabular-nums">{i.qty}</td>
                    <td className="py-3 text-right tabular-nums">{formatPrice(i.unit)}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{formatPrice(i.qty * i.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 w-full space-y-1.5 border-t pt-4 text-[14px] sm:w-72">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(r.subtotal)}</span>
            </div>
            {r.bulkDiscount > 0 && <p className="text-right text-[12.5px] text-emerald-700">Includes bulk discount of {formatPrice(r.bulkDiscount)}</p>}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="tabular-nums">{r.shipping ? formatPrice(r.shipping) : "Free"}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-[16px] font-semibold text-slate-900">
              <span>Total paid</span>
              <span className="tabular-nums">{formatPrice(r.total)}</span>
            </div>
          </div>

          <p className="mt-6 border-t pt-4 text-[12.5px] leading-relaxed text-slate-500">
            {r.test && "Test payment: no money was charged. "}
            Keep this receipt for your records. Questions about your order? Quote order ID {r.orderRef} when you contact us.
          </p>
        </div>
      </article>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={printReceipt} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 px-5")}>
          <Printer size={16} /> Print / save as PDF
        </button>
        {!r.detail && (
          <Link href="/account?tab=orders" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 px-5")}>
            <Package size={16} /> View my orders
          </Link>
        )}
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6")}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
