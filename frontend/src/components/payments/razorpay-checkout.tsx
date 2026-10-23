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
  description,
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
  /** One line under the amount, e.g. "25 pieces" */
  description?: string;
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
        // Razorpay hosts the payment window itself, so only its branding and behaviour can be set from here
        const digits = (phone ?? "").replace(/\D/g, "").slice(-10);
        const rzp = new window.Razorpay({
          key: keyId,
          order_id: orderId,
          amount,
          currency: "INR",
          name: "COTTSON Clothing",
          description,
          image: `${window.location.origin}/cottson-logo.png`,
          prefill: { email, name, contact: digits.length === 10 ? `+91${digits}` : undefined },
          theme: { color: "#113858", backdrop_color: "rgba(11, 36, 58, 0.62)" },
          timeout: 900, // the window closes itself after 15 minutes
          retry: { enabled: true, max_count: 3 },
          modal: {
            backdropclose: false, // a stray click outside shouldn't abandon a payment
            confirm_close: true, // ask before closing
            ondismiss: () => handlers.current.onDismiss(),
          },
          handler: (r: RazorpayResult) => handlers.current.onSuccess(r),
        });
        rzp.on("payment.failed", (r) => handlers.current.onFailure(r.error?.description ?? "Payment failed. You can try again."));
        rzp.open();
      })
      .catch(() => handlers.current.onFailure("Could not load the payment window. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [keyId, orderId, amount, email, name, phone, description]);

  return null;
}
