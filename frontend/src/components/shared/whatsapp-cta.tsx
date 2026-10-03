import React from "react";
import { ArrowRight } from "lucide-react";

const trustAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces&q=80",
];

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.63 7.33C8.44 7.33 8.13 7.4 7.88 7.67C7.62 7.95 6.9 8.63 6.9 10.02C6.9 11.41 7.91 12.75 8.05 12.94C8.19 13.13 10.02 15.95 12.82 17.16C13.49 17.45 14.01 17.62 14.41 17.75C15.08 17.96 15.69 17.93 16.18 17.86C16.72 17.78 17.85 17.18 18.08 16.53C18.32 15.88 18.32 15.32 18.25 15.21C18.18 15.09 18 15.03 17.72 14.89C17.44 14.75 16.08 14.08 15.83 13.99C15.58 13.89 15.4 13.85 15.21 14.13C15.03 14.41 14.5 15.03 14.34 15.21C14.18 15.4 14.02 15.42 13.74 15.28C13.46 15.14 12.56 14.85 11.49 13.89C10.66 13.15 10.1 12.24 9.94 11.96C9.78 11.68 9.92 11.53 10.06 11.39C10.19 11.26 10.35 11.05 10.49 10.89C10.63 10.73 10.68 10.61 10.77 10.42C10.86 10.24 10.81 10.07 10.74 9.93C10.68 9.79 10.12 8.42 9.89 7.86C9.66 7.32 9.43 7.39 9.26 7.38C9.1 7.38 8.91 7.33 8.63 7.33Z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LayersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 2 10 5-10 5L2 7l10-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 12 10 5 10-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 17 10 5 10-5" />
    </svg>
  );
}

function HeadphonesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

export function WhatsAppCTA({
  whatsappUrl = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement",
  imageSrc = "/clothing-rack.png",
  imageAlt = "Cottson Corporate Clothing Rack",
}: {
  whatsappUrl?: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="w-full bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div
        className="
          relative mx-auto max-w-[1360px] overflow-hidden
          rounded-[26px] sm:rounded-[32px] lg:rounded-[36px]
          border border-slate-200/80 bg-white
          shadow-[0_12px_45px_rgba(17,56,88,0.06)]
        "
      >
        {imageSrc ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full sm:w-[54%] lg:w-[50%] xl:w-[48%] overflow-hidden">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="h-full w-full object-cover object-left-center sm:object-center"
              loading="lazy"
              decoding="async"
            />
            <div
              className="
                pointer-events-none absolute inset-y-0 left-0
                w-24 sm:w-36 lg:w-56
                bg-gradient-to-r from-white via-white/85 to-transparent
                backdrop-blur-[5px]
              "
            />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden sm:block sm:w-[50%] lg:w-[46%] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white to-transparent backdrop-blur-[4px]" />
          </div>
        )}

        <div
          className="
            relative z-10 w-full
            p-7 sm:p-10 lg:p-12 xl:p-14
            sm:max-w-[70%] lg:max-w-[58%] xl:max-w-[56%]
          "
        >
          <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
            LET&apos;S BRING YOUR IDEA TO LIFE.
          </p>

          <h2 className="mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-[#113858] sm:mt-3.5 sm:text-[38px] md:text-[42px] lg:text-[46px]">
            Need a custom<br />
            clothing solution?
          </h2>

          <p className="mt-3 max-w-[440px] text-[13.5px] leading-relaxed text-[#607487] sm:mt-3.5 sm:text-[15px]">
            Talk to our team on WhatsApp and get expert advice for your team wear, uniforms and events.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-7 sm:gap-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="
                group inline-flex items-center gap-2.5 rounded-full
                bg-[#00B050] px-5 sm:px-6 py-3 sm:py-3.5
                text-[13.5px] sm:text-[14.5px] font-semibold text-white !text-white
                shadow-md shadow-[#00B050]/25
                transition-all duration-300 ease-out
                hover:-translate-y-0.5 hover:bg-[#009b46] hover:shadow-lg hover:shadow-[#00B050]/35
                active:scale-[0.98]
              "
              style={{ color: "#ffffff" }}
            >
              <WhatsAppIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 fill-white" />
              <span className="!text-white text-white">Chat on WhatsApp</span>
              <ArrowRight
                size={16}
                strokeWidth={2.4}
                className="!text-white text-white transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: "#ffffff" }}
              />
            </a>

            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2 overflow-hidden">
                {trustAvatars.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Client team"
                    loading="lazy"
                    decoding="async"
                    className="inline-block h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-xs sm:h-8 sm:w-8"
                  />
                ))}
              </div>

              <div className="text-[11.5px] sm:text-[12.5px] font-medium leading-[1.3] text-[#607487]">
                <p>
                  Trusted by <span className="font-bold text-[#113858]">500+</span>
                </p>
                <p>teams and businesses</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5 sm:mt-10 sm:gap-8 border-t border-slate-100 pt-5 sm:pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#113858]/80 shrink-0" />
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight text-[#113858]">
                Expert Guidance
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LayersIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#113858]/80 shrink-0" />
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight text-[#113858]">
                Best Fabric Options
              </span>
            </div>

            <div className="flex items-center gap-2">
              <HeadphonesIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#113858]/80 shrink-0" />
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight text-[#113858]">
                Fast Response
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default WhatsAppCTA;
