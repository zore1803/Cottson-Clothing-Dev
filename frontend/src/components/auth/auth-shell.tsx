import Link from "next/link";
import { Check } from "lucide-react";

const PERKS = ["Save your designs and reorder in a click", "Track every order in one place", "Faster checkout with saved details"];

// Two-panel layout shared by every auth page: brand panel on the left, form on the right.
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-[#F5F8FA] px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
      <div className="mx-auto grid max-w-[1020px] overflow-hidden rounded-[28px] bg-white shadow-xl shadow-[#113858]/10 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between bg-[#113858] p-10 text-white lg:flex xl:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/[0.06]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-[#c8426b]/20"
          />
          <Link href="/" className="relative w-fit">
            <img src="/cottson.png" alt="COTTSON" className="h-9 w-auto object-contain brightness-0 invert" />
          </Link>
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Your Cottson account</p>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.035em] xl:text-[40px]">
              Corporate wear,
              <br />
              made simple.
            </h2>
            <ul className="mt-8 space-y-4">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[14.5px] leading-snug text-white/85">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="p-7 sm:p-10 xl:p-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#607487]">{eyebrow}</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#113858] sm:text-[38px]">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-[#607487]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-[#113858]/10 pt-6 text-[14px] text-[#607487]">{footer}</div>}
        </div>
      </div>
    </section>
  );
}
