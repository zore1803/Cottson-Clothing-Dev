"use client";

import { useInView } from "@/hooks/use-in-view";
import { ClientMarqueeRows } from "@/components/shared/client-logo-carousel";

export function TrustedBy() {
  const { ref: sectionRef, isInView } = useInView({ rootMargin: "250px" });

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="
        overflow-hidden
        bg-white
        py-20
        md:py-24
        lg:py-28
      "
    >
      <div
        className="
          mx-auto
          mb-12
          max-w-[1120px]
          px-5
          text-center
          sm:px-6
          md:mb-14
        "
      >
        <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
          Trusted By
        </p>

        <h2
          className="
            mx-auto
            max-w-[720px]
            break-words
            text-[34px]
            font-bold
            leading-[1.12]
            tracking-[-0.025em]
            text-[#113858]
            sm:text-[42px]
            lg:text-[48px]
          "
        >
          Trusted by teams that
          <span className="text-[#113858]/45">
            {" "}care about their identity.
          </span>
        </h2>

        <p
          className="
            mx-auto
            mt-4
            max-w-[520px]
            break-words
            text-[14px]
            leading-relaxed
            text-[#607487]
            sm:text-[15px]
          "
        >
          Helping companies and teams bring their brand to life
          through thoughtfully customised corporate apparel.
        </p>
      </div>

      <ClientMarqueeRows isInView={isInView} />
    </section>
  );
}

export default TrustedBy;
