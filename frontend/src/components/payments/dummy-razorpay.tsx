"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, Loader2, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

const METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", icon: Landmark },
] as const;

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Stand-in for Razorpay's checkout popup (see lib/razorpay-dummy.ts). Like the real one it reports
// back a result with the order id, payment id and signature, a failure, or a dismissal.
export function DummyRazorpayModal({
  orderId,
  amount,
  email,
  onSuccess,
  onFailure,
  onDismiss,
}: {
  orderId: string;
  /** In paise, as Razorpay expects */
  amount: number;
  email: string;
  onSuccess: (r: RazorpayResult) => void;
  onFailure: (message: string) => void;
  onDismiss: () => void;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onDismiss]);

  async function pay(outcome: "success" | "failure") {
    setBusy(true);
    try {
      const res = await fetch("/api/payments/dummy/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ razorpay_order_id: orderId, method, outcome }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) onFailure(data?.error?.description ?? "Payment failed");
      else onSuccess(data as RazorpayResult);
    } catch {
      onFailure("Could not reach the payment service");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-[#113858] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8DB8DC]">COTTSON</p>
            <p className="mt-0.5 text-2xl font-semibold">{rupees(amount)}</p>
            <p className="text-xs text-white/70">{email}</p>
          </div>
          <button type="button" onClick={onDismiss} disabled={busy} aria-label="Close payment" className="rounded-full p-1 text-white/80 hover:bg-white/10 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="bg-amber-50 px-5 py-2 text-xs font-medium text-amber-800">Test mode: this is a dummy Razorpay checkout. No money is charged.</div>
        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pay using</p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition", method === m.id ? "border-[#113858] bg-[#EAF1F7] text-[#113858]" : "border-slate-200 text-slate-600 hover:border-slate-300")}
              >
                <m.icon size={18} />
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => pay("success")} disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#113858] text-sm font-semibold text-white transition hover:bg-[#0b243a] disabled:opacity-70">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Pay {rupees(amount)}
          </button>
          <button type="button" onClick={() => pay("failure")} disabled={busy} className="h-9 w-full text-xs font-semibold text-slate-500 underline-offset-4 hover:underline disabled:opacity-60">
            Simulate a failed payment
          </button>
        </div>
      </div>
    </div>
  );
}
