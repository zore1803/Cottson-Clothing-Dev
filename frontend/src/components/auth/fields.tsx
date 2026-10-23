"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, Search } from "lucide-react";
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

const COUNTRIES: [iso: string, name: string, code: string][] = [
  ["IN", "India", "+91"], ["US", "United States", "+1"], ["CA", "Canada", "+1"], ["GB", "United Kingdom", "+44"], ["AE", "United Arab Emirates", "+971"],
  ["SA", "Saudi Arabia", "+966"], ["QA", "Qatar", "+974"], ["KW", "Kuwait", "+965"], ["OM", "Oman", "+968"], ["BH", "Bahrain", "+973"],
  ["SG", "Singapore", "+65"], ["MY", "Malaysia", "+60"], ["AU", "Australia", "+61"], ["NZ", "New Zealand", "+64"], ["DE", "Germany", "+49"],
  ["FR", "France", "+33"], ["IT", "Italy", "+39"], ["ES", "Spain", "+34"], ["NL", "Netherlands", "+31"], ["CH", "Switzerland", "+41"],
  ["SE", "Sweden", "+46"], ["IE", "Ireland", "+353"], ["ZA", "South Africa", "+27"], ["NG", "Nigeria", "+234"], ["KE", "Kenya", "+254"],
  ["BD", "Bangladesh", "+880"], ["LK", "Sri Lanka", "+94"], ["NP", "Nepal", "+977"], ["PK", "Pakistan", "+92"], ["ID", "Indonesia", "+62"],
  ["TH", "Thailand", "+66"], ["PH", "Philippines", "+63"], ["VN", "Vietnam", "+84"], ["JP", "Japan", "+81"], ["KR", "South Korea", "+82"],
  ["CN", "China", "+86"], ["HK", "Hong Kong", "+852"], ["BR", "Brazil", "+55"], ["MX", "Mexico", "+52"], ["TR", "Turkey", "+90"],
];

/** Splits a stored phone like "+971 50 123 4567" into a known country code and the rest (defaults to India) */
function splitPhone(value: string) {
  const v = value.trim();
  const hit = [...COUNTRIES].sort((a, b) => b[2].length - a[2].length).find(([, , c]) => v.startsWith(c));
  return hit ? { iso: COUNTRIES.find(([, , c]) => c === hit[2])![0], number: v.slice(hit[2].length).trim() } : { iso: "IN", number: v };
}

/** Phone number with a searchable country-code picker (opens downward, 3 rows visible). Submits one combined value ("+91 98765 43210") as `name`, or "" when left empty. */
export function PhoneField({ id = "phone", label = "Phone", defaultValue = "", className }: { id?: string; label?: string; defaultValue?: string; className?: string }) {
  const initial = splitPhone(defaultValue);
  const [iso, setIso] = useState(initial.iso);
  const [number, setNumber] = useState(initial.number.replace(/\D/g, "").slice(0, 10));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const code = COUNTRIES.find(([i]) => i === iso)![2];

  const needle = q.trim().toLowerCase().replace(/^\+/, "");
  const shown = needle ? COUNTRIES.filter(([i, name, c]) => name.toLowerCase().includes(needle) || i.toLowerCase().includes(needle) || c.slice(1).startsWith(needle)) : COUNTRIES;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // Opening near the bottom of the screen: scroll the page just enough to show the whole list
  useEffect(() => {
    if (open) panel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (i: string) => {
    setIso(i);
    setOpen(false);
    setQ("");
  };
  const box = "h-12 rounded-xl border border-[#113858]/15 bg-[#F5F8FA] text-[15px] text-[#113858] outline-none transition focus:border-[#113858] focus:bg-white focus:ring-4 focus:ring-[#113858]/10";

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#607487]">{label}</label>
      <div className="mt-2 flex gap-2">
        <div ref={wrap} className="relative shrink-0">
          <button
            type="button"
            aria-label="Country code"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => {
              setOpen((o) => !o);
              setActive(Math.max(0, COUNTRIES.findIndex(([i]) => i === iso)));
            }}
            className={cn(box, "flex w-[104px] items-center justify-between gap-1 px-3")}
          >
            <span>{iso} {code}</span>
            <ChevronDown size={15} className={cn("shrink-0 text-[#607487] transition", open && "rotate-180")} />
          </button>
          {open && (
            <div ref={panel} className="absolute left-0 top-full z-30 mt-1.5 scroll-mb-6 w-[260px] overflow-hidden rounded-xl border border-[#113858]/15 bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b border-[#113858]/10 px-3">
                <Search size={14} className="shrink-0 text-[#607487]" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, shown.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (shown[active]) pick(shown[active][0]);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setOpen(false);
                    }
                  }}
                  placeholder="Search country or code"
                  aria-label="Search country or code"
                  className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-[#113858] outline-none placeholder:text-[#607487]/60"
                />
              </div>
              <ul ref={list} role="listbox" className="max-h-[132px] overflow-y-auto py-1">
                {shown.length === 0 && <li className="px-3 py-3 text-[13px] text-[#607487]">No match</li>}
                {shown.map(([i, name, c], n) => (
                  <li
                    key={i}
                    role="option"
                    aria-selected={i === iso}
                    onMouseEnter={() => setActive(n)}
                    onClick={() => pick(i)}
                    className={cn("flex h-[42px] cursor-pointer items-center justify-between gap-3 px-3 text-[14px] text-[#113858]", n === active && "bg-[#F5F8FA]", i === iso && "font-semibold")}
                  >
                    <span className="truncate">{name}</span>
                    <span className="shrink-0 text-[#607487]">{i} {c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          pattern="\d{10}"
          title="Enter a 10-digit number"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="XXXXX XXXXX"
          className={cn(box, "min-w-0 flex-1 px-4 placeholder:text-[#607487]/60")}
        />
        <input type="hidden" name={id} value={number.trim() ? `${code} ${number.trim()}` : ""} />
      </div>
    </div>
  );
}
