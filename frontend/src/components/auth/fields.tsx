"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  id,
  type = "text",
  className,
  ...rest
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#607487]">
        {label}
        {rest.required && " *"}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={id}
          type={isPassword && show ? "text" : type}
          className={cn(
            "h-12 w-full rounded-xl border border-[#113858]/15 bg-[#F5F8FA] px-4 text-[15px] text-[#113858] outline-none transition placeholder:text-[#607487]/60 focus:border-[#113858] focus:bg-white focus:ring-4 focus:ring-[#113858]/10 disabled:opacity-60",
            isPassword && "pr-12"
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607487] transition hover:text-[#113858]"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#113858] px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0b243a] disabled:pointer-events-none disabled:opacity-70"
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-[#c8426b]/10 px-4 py-3 text-[13.5px] font-medium text-[#a32f52]">
      {message}
    </p>
  );
}

// POSTs/PATCHes JSON and returns the parsed body, throwing the server's error message on failure.
export async function send<T = Record<string, unknown>>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
}
