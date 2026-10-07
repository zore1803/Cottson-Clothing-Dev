"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { RazorpayResult } from "./dummy-razorpay";

type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const el = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error("Could not load Razorpay")));
    if (!existing) document.body.appendChild(el);
  });
}

/** Opens Razorpay's own checkout popup for an order created on the server. Renders nothing itself. */
export function RazorpayCheckout({
  keyId,
  orderId,
  amount,
  email,
  name,
  phone,
  onSuccess,
  onFailure,
  onDismiss,
}: {
  keyId: string;
  orderId: string;
  /** In paise */
  amount: number;
  email: string;
  name?: string;
  phone?: string;
  onSuccess: (r: RazorpayResult) => void;
  onFailure: (message: string) => void;
  onDismiss: () => void;
}) {
  const handlers = useRef({ onSuccess, onFailure, onDismiss });
  useLayoutEffect(() => {
    handlers.current = { onSuccess, onFailure, onDismiss };
  });

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.Razorpay) return;
        const rzp = new window.Razorpay({
          key: keyId,
          order_id: orderId,
          amount,
          currency: "INR",
          name: "COTTSON Clothing",
          prefill: { email, name, contact: phone },
          theme: { color: "#113858" },
          handler: (r: RazorpayResult) => handlers.current.onSuccess(r),
          modal: { ondismiss: () => handlers.current.onDismiss() },
        });
        rzp.on("payment.failed", (r) => handlers.current.onFailure(r.error?.description ?? "Payment failed. You can try again."));
        rzp.open();
      })
      .catch(() => handlers.current.onFailure("Could not load the payment window. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [keyId, orderId, amount, email, name, phone]);

  return null;
}
