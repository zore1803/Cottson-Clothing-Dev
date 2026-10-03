"use client";

import React from "react";
import {
  initialTopClients,
  initialBottomClients,
  ClientLogo,
} from "@/data/cottson-clients";
import { useInView } from "@/hooks/use-in-view";

function optimizeCloudinaryUrl(url: string, width = 220) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/image/upload/")) {
    return url.replace(
      /\/image\/upload\/([^/]*\/)?/,
      `/image/upload/e_trim,f_auto,q_auto:eco,w_${width},c_limit/`
    );
  }
  return url;
}

function EyebrowPill({ text }: { text: string }) {
  return (
    <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
      {text}
    </p>
  );
}

function ClientLogoItem({ client }: { client: ClientLogo }) {
  return (
    <div
      className="
        flex
        h-[60px]
        w-[160px]
        shrink-0
        items-center
        justify-center
        px-3
        select-none
        [transform:translateZ(0)]
        sm:h-[70px]
        sm:w-[190px]
        sm:px-4
        lg:h-[78px]
        lg:w-[210px]
      "
    >
      <img
        src={optimizeCloudinaryUrl(client.url, 220)}
        alt={client.name || "Client Logo"}
        loading="lazy"
        decoding="async"
        draggable="false"
        className="
          h-[34px]
          w-auto
          max-w-[140px]
          object-contain
          sm:h-[40px]
          sm:max-w-[165px]
          lg:h-[44px]
          lg:max-w-[185px]
          transition-transform
          duration-300
          hover:scale-105
        "
      />
    </div>
  );
}

export function ClientMarqueeRows({ isInView = true }: { isInView?: boolean }) {
  return (
    <div className="relative">
      <div
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          z-20
          h-full
          w-[40px]
          bg-gradient-to-r
          from-white
          to-transparent
          sm:w-[90px]
          lg:w-[140px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-0
          top-0
          z-20
          h-full
          w-[40px]
          bg-gradient-to-l
          from-white
          to-transparent
          sm:w-[90px]
          lg:w-[140px]
        "
      />

      <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
        <div className="overflow-hidden">
          <div
            className="client-marquee-track flex w-max will-change-transform group-hover:[animation-play-state:paused] hover:[animation-play-state:paused]"
            style={{
              animation: "clientMarqueeLeft 65s linear infinite",
              animationPlayState: isInView ? "running" : "paused",
            }}
          >
            <div className="flex shrink-0 items-center gap-8 sm:gap-12 md:gap-14 lg:gap-16 pr-8 sm:pr-12 md:pr-14 lg:pr-16">
              {initialTopClients.map((client, index) => (
                <ClientLogoItem key={`top-1-${client.id}-${index}`} client={client} />
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-8 sm:gap-12 md:gap-14 lg:gap-16 pr-8 sm:pr-12 md:pr-14 lg:pr-16" aria-hidden="true">
              {initialTopClients.map((client, index) => (
                <ClientLogoItem key={`top-2-${client.id}-${index}`} client={client} />
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <div
            className="client-marquee-track flex w-max will-change-transform group-hover:[animation-play-state:paused] hover:[animation-play-state:paused]"
            style={{
              animation: "clientMarqueeRight 70s linear infinite",
              animationPlayState: isInView ? "running" : "paused",
            }}
          >
            <div className="flex shrink-0 items-center gap-8 sm:gap-12 md:gap-14 lg:gap-16 pr-8 sm:pr-12 md:pr-14 lg:pr-16">
              {initialBottomClients.map((client, index) => (
                <ClientLogoItem key={`bottom-1-${client.id}-${index}`} client={client} />
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-8 sm:gap-12 md:gap-14 lg:gap-16 pr-8 sm:pr-12 md:pr-14 lg:pr-16" aria-hidden="true">
              {initialBottomClients.map((client, index) => (
                <ClientLogoItem key={`bottom-2-${client.id}-${index}`} client={client} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientLogoCarousel({ id = "clients" }: { id?: string }) {
  const { ref: sectionRef, isInView } = useInView({ rootMargin: "250px" });

  return (
    <section
      ref={sectionRef}
      id={id}
      className="overflow-hidden bg-white py-16 sm:py-20"
    >
      <div className="mb-10 px-5 text-center sm:px-8">
        <EyebrowPill text="Trusted by" />

        <h2
          className="
            text-[28px]
            font-bold
            leading-[1.12]
            tracking-[-0.025em]
            text-[#113858]
            sm:text-[34px]
          "
        >
          Our Clients
          <span className="text-[#113858]/45"> Trust Us</span>
        </h2>
      </div>

      <ClientMarqueeRows isInView={isInView} />
    </section>
  );
}

export default ClientLogoCarousel;
