"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const benefits = [
  "Low MOQ: 25 Pcs",
  "Custom Branding",
  "Bulk Orders",
  "Pan-India Delivery",
];

export function Hero() {
  return (
    <main id="home" className="relative bg-white overflow-hidden">
      <section
        className="
          relative mx-auto w-full max-w-[1600px]
          px-4 pb-6 pt-[84px]
          sm:px-6 sm:pb-8 sm:pt-[96px]
          md:px-8 md:pt-[106px]
          lg:min-h-[640px] lg:px-8 lg:pt-[125px] lg:pb-12
          xl:min-h-[680px] xl:px-10 xl:pt-[135px]
          2xl:min-h-[720px] 2xl:pt-[140px]
        "
      >
        <div
          className="
            relative z-20 mx-auto flex w-full max-w-[1500px]
            flex-col items-center
            lg:min-h-[560px]
          "
        >
          {/* DESKTOP LEFT — CUSTOM CLIENT SHOWCASE */}
          <div
            className="
              pointer-events-none absolute left-[-6%] top-1/2
              hidden h-[620px] w-[560px]
              -translate-y-1/2 origin-left
              lg:block
              lg:scale-[0.60] lg:left-[-70px]
              xl:scale-[0.78] xl:left-[-35px]
              2xl:scale-[0.95] 2xl:left-[-15px]
            "
          >
            <Link
              href="/products"
              className="pointer-events-auto group absolute left-[70px] top-[5px] z-20"
              title="DOMS Corporate Formal Shirt"
            >
              <div className="relative">
                <div className="absolute bottom-[35px] left-1/2 h-[35px] w-[220px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-doms.png"
                  alt="Custom DOMS corporate shirt"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.09)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:scale-[1.02]"
                />
              </div>
            </Link>

            <Link
              href="/products"
              className="pointer-events-auto group absolute bottom-[25px] -left-[40px] z-30"
              title="ICICI Bank Custom Pique Polo"
            >
              <div className="relative">
                <div className="absolute bottom-[25px] left-1/2 h-[28px] w-[170px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-icici.png"
                  alt="Custom ICICI Bank polo"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.08)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:-rotate-1"
                />
              </div>
            </Link>

            <Link
              href="/products"
              className="pointer-events-auto group absolute bottom-[25px] right-[40px] z-30"
              title="TVS Motors Executive Formal Shirt"
            >
              <div className="relative">
                <div className="absolute bottom-[25px] left-1/2 h-[28px] w-[170px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-tvs.png"
                  alt="Custom TVS company shirt"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.08)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:rotate-1"
                />
              </div>
            </Link>
          </div>

          {/* CENTER — MAIN HERO CONTENT */}
          <div
            className="
              relative z-50
              flex w-full
              flex-col items-center
              px-2 text-center
              sm:px-4
              lg:absolute lg:left-1/2 lg:top-1/2
              lg:-translate-x-1/2 lg:-translate-y-1/2
              lg:max-w-[420px]
              xl:max-w-[530px]
              2xl:max-w-[620px]
            "
          >
            <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
              Custom Apparel for Teams
            </p>

            <h1
              className="
                text-[34px] sm:text-[44px]
                md:text-[50px]
                lg:text-[42px]
                xl:text-[50px]
                2xl:text-[58px]
                font-bold
                leading-[1.10]
                tracking-[-0.025em]
                text-[#113858]
              "
            >
              Corporate Clothing
              <br />
              <span className="text-[#113858]/45">
                Made for Your Brand.
              </span>
            </h1>

            <p
              className="
                mx-auto mt-4 sm:mt-5
                max-w-[500px]
                text-[14px] sm:text-[15.5px]
                leading-relaxed
                text-[#607487]
              "
            >
              Custom clothing for companies, teams and events —
              from branded T-shirts to shirts, polos and jackets.
            </p>

            <div className="mt-7 sm:mt-9 flex items-center justify-center">
              <Link
                href="/products"
                className="
                  group flex h-[48px] sm:h-[50px]
                  items-center justify-center
                  gap-2.5
                  rounded-full
                  bg-[#113858]
                  px-8 sm:px-10
                  text-[14px] sm:text-[15px]
                  font-semibold
                  !text-white text-white
                  shadow-[0_6px_22px_rgba(17,56,88,0.28)]
                  transition-all
                  duration-300
                  hover:-translate-y-[2px]
                  hover:bg-[#0b243a]
                  hover:!text-white hover:text-white
                  hover:shadow-[0_10px_28px_rgba(17,56,88,0.35)]
                  active:scale-[0.98]
                "
                style={{ color: "#ffffff" }}
              >
                <span className="!text-white text-white" style={{ color: "#ffffff" }}>
                  Shop Now
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2.4}
                  className="!text-white text-white transition-transform duration-300 group-hover:translate-x-[4px]"
                  style={{ color: "#ffffff" }}
                />
              </Link>
            </div>
          </div>

          {/* DESKTOP RIGHT — ENTERPRISE CLIENTS (JSW · HONDA · DERMA CO) */}
          <div
            className="
              pointer-events-none absolute right-[-6%] top-1/2
              hidden h-[620px] w-[560px]
              -translate-y-1/2 origin-right
              lg:block
              lg:scale-[0.60] lg:right-[-70px]
              xl:scale-[0.78] xl:right-[-35px]
              2xl:scale-[0.95] 2xl:right-[-15px]
            "
          >
            <Link
              href="/products"
              className="pointer-events-auto group absolute right-[70px] top-[5px] z-20"
              title="JSW Corporate Formal Shirt"
            >
              <div className="relative">
                <div className="absolute bottom-[35px] left-1/2 h-[35px] w-[220px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-jsw.png"
                  alt="Custom JSW corporate formal shirt"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.09)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:scale-[1.02]"
                />
              </div>
            </Link>

            <Link
              href="/products"
              className="pointer-events-auto group absolute bottom-[25px] left-[30px] z-30"
              title="Honda Motors Official Polo"
            >
              <div className="relative">
                <div className="absolute bottom-[25px] left-1/2 h-[28px] w-[170px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-honda.png"
                  alt="Custom Honda corporate polo"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.08)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:-rotate-1"
                />
              </div>
            </Link>

            <Link
              href="/products"
              className="pointer-events-auto group absolute bottom-[25px] -right-[60px] z-30"
              title="The Derma Co Branded Crewneck T-Shirt"
            >
              <div className="relative">
                <div className="absolute bottom-[25px] left-1/2 h-[28px] w-[170px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-xl" />
                <img
                  src="/client-dermaco.png"
                  alt="Custom The Derma Co team t-shirt"
                  loading="lazy"
                  decoding="async"
                  className="relative h-[390px] w-[360px] object-contain drop-shadow-[0_18px_20px_rgba(17,56,88,0.08)] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:rotate-1"
                />
              </div>
            </Link>
          </div>

          {/* MOBILE & TABLET (< 1024px) — DUAL OVERLAPPING CLUSTERS */}
          <div className="relative z-20 mt-6 sm:mt-8 w-full max-w-[560px] mx-auto lg:hidden">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 items-end">
              <Link
                href="/products"
                className="group relative flex flex-col items-center justify-end rounded-2xl bg-gradient-to-b from-slate-50/70 to-white/95 border border-slate-200/80 p-1.5 sm:p-3 pb-2.5 sm:pb-3 shadow-[0_6px_18px_rgba(17,56,88,0.06)] overflow-visible transition-transform duration-300 hover:-translate-y-1"
                title="Enterprise Clients (DOMS · ICICI · TVS)"
              >
                <div className="relative h-[150px] sm:h-[190px] w-full flex items-end justify-center">
                  <div className="absolute top-[2px] left-1/2 -translate-x-1/2 z-10 w-[95px] sm:w-[130px]">
                    <div className="absolute bottom-[8px] left-1/2 h-[12px] w-[75px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-doms.png"
                      alt="Custom DOMS corporate shirt"
                      className="h-[100px] sm:h-[135px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.10)]"
                    />
                  </div>
                  <div className="absolute bottom-[2px] -left-[10px] sm:left-[-4px] z-20 w-[90px] sm:w-[125px]">
                    <div className="absolute bottom-[6px] left-1/2 h-[10px] w-[70px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-icici.png"
                      alt="Custom ICICI Bank polo"
                      className="h-[92px] sm:h-[125px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.12)]"
                    />
                  </div>
                  <div className="absolute bottom-[2px] -right-[10px] sm:right-[-4px] z-20 w-[90px] sm:w-[125px]">
                    <div className="absolute bottom-[6px] left-1/2 h-[10px] w-[70px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-tvs.png"
                      alt="Custom TVS company shirt"
                      className="h-[92px] sm:h-[125px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.12)]"
                    />
                  </div>
                </div>
              </Link>

              <Link
                href="/products"
                className="group relative flex flex-col items-center justify-end rounded-2xl bg-gradient-to-b from-slate-50/70 to-white/95 border border-slate-200/80 p-1.5 sm:p-3 pb-2.5 sm:pb-3 shadow-[0_6px_18px_rgba(17,56,88,0.06)] overflow-visible transition-transform duration-300 hover:-translate-y-1"
                title="Enterprise Clients (JSW · Honda · Derma Co)"
              >
                <div className="relative h-[150px] sm:h-[190px] w-full flex items-end justify-center">
                  <div className="absolute top-[2px] left-1/2 -translate-x-1/2 z-10 w-[95px] sm:w-[130px]">
                    <div className="absolute bottom-[8px] left-1/2 h-[12px] w-[75px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-jsw.png"
                      alt="Custom JSW corporate formal shirt"
                      className="h-[100px] sm:h-[135px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.10)]"
                    />
                  </div>
                  <div className="absolute bottom-[2px] -left-[10px] sm:left-[-4px] z-20 w-[90px] sm:w-[125px]">
                    <div className="absolute bottom-[6px] left-1/2 h-[10px] w-[70px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-honda.png"
                      alt="Custom Honda corporate polo"
                      className="h-[92px] sm:h-[125px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.12)]"
                    />
                  </div>
                  <div className="absolute bottom-[2px] -right-[10px] sm:right-[-4px] z-20 w-[90px] sm:w-[125px]">
                    <div className="absolute bottom-[6px] left-1/2 h-[10px] w-[70px] -translate-x-1/2 rounded-full bg-[#113858]/10 blur-md" />
                    <img
                      src="/client-dermaco.png"
                      alt="Custom The Derma Co team t-shirt"
                      className="h-[92px] sm:h-[125px] w-full object-contain drop-shadow-[0_10px_14px_rgba(17,56,88,0.12)]"
                    />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS / TRUST STRIP */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 pb-8 sm:pb-12">
        <div className="group relative overflow-hidden border-y border-[#113858]/10 py-4 sm:py-5 select-none">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 sm:w-24 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 sm:w-24 bg-gradient-to-l from-white to-transparent" />

          <div
            className="hero-marquee-track flex w-max will-change-transform [transform:translateZ(0)] group-hover:[animation-play-state:paused]"
            style={{
              animation: "heroMarqueeLeft 28s linear infinite",
            }}
          >
            <div className="flex shrink-0 items-center gap-8 sm:gap-14 md:gap-16 pr-8 sm:pr-14 md:pr-16">
              {[...benefits, ...benefits, ...benefits].map((benefit, idx) => (
                <div
                  key={`b1-${idx}`}
                  className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap text-[13.5px] sm:text-[15.5px] md:text-[16px] font-semibold text-[#113858] transition-colors duration-200"
                >
                  <span className="flex h-[20px] w-[20px] sm:h-[23px] sm:w-[23px] shrink-0 items-center justify-center rounded-full bg-[#113858] text-white shadow-sm">
                    <Check size={12} strokeWidth={2.8} />
                  </span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div
              className="flex shrink-0 items-center gap-8 sm:gap-14 md:gap-16 pr-8 sm:pr-14 md:pr-16"
              aria-hidden="true"
            >
              {[...benefits, ...benefits, ...benefits].map((benefit, idx) => (
                <div
                  key={`b2-${idx}`}
                  className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap text-[13.5px] sm:text-[15.5px] md:text-[16px] font-semibold text-[#113858] transition-colors duration-200"
                >
                  <span className="flex h-[20px] w-[20px] sm:h-[23px] sm:w-[23px] shrink-0 items-center justify-center rounded-full bg-[#113858] text-white shadow-sm">
                    <Check size={12} strokeWidth={2.8} />
                  </span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Hero;
