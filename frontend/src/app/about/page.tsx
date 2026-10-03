"use client";

import {
  Eye,
  Target,
  Award,
  Wrench,
  Users,
  Heart,
  Building2,
  Clock3,
  Boxes,
  PackageCheck,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AboutReels } from "@/components/shared/about-reels";
import { ClientLogoCarousel } from "@/components/shared/client-logo-carousel";
import { WhatsAppCTA } from "@/components/shared/whatsapp-cta";

/* =========================================================
   HISTORICAL CONTENT & MILESTONES
========================================================= */

const storyParagraphs = [
  "Our story traces back to March 1956, when the founder's great-grandfather arrived in Bombay and began his career at Apollo Mills. His dedication and skill helped him rise through the ranks, eventually contributing to other iconic textile mills such as Kamala Mills and Bombay Textiles. This formative era marked the true beginning of our family's connection to fabric, craftsmanship, and the world of cotton. A legacy rooted in hard work and textile expertise began here.",
  "In August 2021, inspired by the growing wave of e-commerce in India, Bacoola Apparels was launched with a vision to build a strong D2C clothing brand. The brand quickly gained momentum and successfully sold premium apparel across leading marketplaces, including Amazon, Flipkart, Peachmode, and others.",
  "By December 2021, corporate inquiries started pouring in. Clients appreciated the distinctive quality that Bacoola Apparels offered, which matched premium retail standards. When the same craftsmanship was extended to corporate wear and event merchandise, demand grew rapidly, signalling a new opportunity.",
  "May 2022 marked the official launch of Cottson Clothing as a dedicated brand to serve the corporate clothing and uniform segment. This new identity allowed us to create a specialised category separate from retail, focused solely on delivering high-quality, custom-made corporate apparel.",
  "By August 2025, Cottson Clothing expanded to a strong team of more than 80 members, proudly serving over 100 clients across India. What began as a family legacy in textile craftsmanship has now evolved into a trusted national brand known for quality, consistency, and customer-first service.",
];

const storyMilestones = [
  {
    period: "March 1956",
    yearShort: "1956",
    tag: "Textile Roots",
    title: "A Legacy Born in Bombay's Iconic Cotton Mills",
    body: storyParagraphs[0],
    highlight: "Apollo Mills · Kamala Mills · Bombay Textiles",
    image: "/images/about/mill-worker.jpg",
    caption: "Apollo Mills Loom Artisan, Bombay",
    subtitle: "The formative era of our family's cotton craftsmanship",
    location: "Apollo Mills, Bombay",
  },
  {
    period: "August 2021",
    yearShort: "2021",
    tag: "Digital Genesis",
    title: "Bacoola Apparels & The D2C Inception",
    body: storyParagraphs[1],
    highlight: "Amazon · Flipkart · Peachmode · Nationwide Retail",
    image: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790315513/Bombay_Dyeing_Mills_Image.avif",
    caption: "Bombay Dyeing Mills Heritage",
    subtitle: "Carrying generational fabric expertise into modern e-commerce",
    location: "Textile District, Mumbai",
  },
  {
    period: "December 2021",
    yearShort: "2021",
    tag: "The Corporate Turning Point",
    title: "Enterprise Demand for Retail-Grade Workwear",
    body: storyParagraphs[2],
    highlight: "Custom corporate apparel · Event merchandise",
    image: "/images/about/mills-of-bombay.jpg",
    caption: "Historic Mills of Bombay",
    subtitle: "Extending fine retail craftsmanship into corporate uniforms",
    location: "Central Mills, Mumbai",
  },
  {
    period: "May 2022",
    yearShort: "2022",
    tag: "Brand Launch",
    title: "Cottson Clothing Officially Born",
    body: storyParagraphs[3],
    highlight: "Dedicated corporate clothing & uniform manufacturing",
    image: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790315506/Apollo_Bunder_Image.avif",
    caption: "Apollo Bunder & Gateway Harbour",
    subtitle: "A dedicated brand created exclusively for enterprise apparel",
    location: "Apollo Bunder, Mumbai",
  },
  {
    period: "August 2025 & Beyond",
    yearShort: "2025",
    tag: "National Scale",
    title: "80+ Team Members · 100+ Enterprise Clients",
    body: storyParagraphs[4],
    highlight: "Pan-India presence · Customer-first craftsmanship",
    image: "/cottson_logo.png",
    caption: "Cottson Clothing Today",
    subtitle: "From a family legacy to a trusted national enterprise partner",
    location: "Pan-India Presence",
    isEmblem: true,
  },
];

const stats = [
  {
    id: 1,
    icon: Clock3,
    value: "1956",
    label: "The beginning of our textile legacy",
  },
  {
    id: 2,
    icon: Users,
    value: "80+",
    label: "Team members",
  },
  {
    id: 3,
    icon: Building2,
    value: "100+",
    label: "Clients across India",
  },
  {
    id: 4,
    icon: Boxes,
    value: "2022",
    label: "Cottson Clothing launched",
  },
];

const uniquePoints = [
  {
    id: 1,
    icon: Award,
    title: "Premium Quality",
    description: "High-quality corporate apparel built around premium standards.",
  },
  {
    id: 2,
    icon: Wrench,
    title: "Custom Manufacturing",
    description: "Made-to-order clothing tailored to each corporate requirement.",
  },
  {
    id: 3,
    icon: PackageCheck,
    title: "Consistent Craftsmanship",
    description: "A textile legacy carried forward through dependable workmanship.",
  },
  {
    id: 4,
    icon: Heart,
    title: "Customer First",
    description: "A service-led approach focused on long-term client relationships.",
  },
];

function EyebrowPill({ text }: { text: string }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#113858]/10 bg-[#F5F8FA] px-3.5 py-[7px]">
      <span className="h-[6px] w-[6px] rounded-full bg-[#113858]" />
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#113858]/60">
        {text}
      </span>
    </div>
  );
}

function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const numericMatch = value.match(/^(\d+)/);
    if (!numericMatch) {
      setDisplay(value);
      return;
    }

    const target = parseInt(numericMatch[1], 10);
    const suffix = value.slice(numericMatch[1].length);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1800;
          const startTime = performance.now();

          function step(now: number) {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.floor(eased * target);
            setDisplay(`${start}${suffix}`);
            if (progress < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

function HowItAllBegan() {
  const [activeEra, setActiveEra] = useState(0);
  const milestoneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToMilestone = (index: number) => {
    setActiveEra(index);
    const target = milestoneRefs.current[index];
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  return (
    <section className="bg-white pt-28 pb-20 sm:pt-32 md:pt-36 md:pb-28 lg:pb-32">
      <div className="mx-auto max-w-[1380px] px-5 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-[840px] text-center md:mb-20">
          <EyebrowPill text="Our Textile Heritage · Est. 1956" />

          <h2 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[46px] lg:text-[56px]">
            How It All Began
            <span className="block text-[#113858]/40">The Cottson Story</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[640px] text-[14px] leading-[1.8] text-[#607487] sm:text-[15px]">
            Seven decades of textile mastery, passed down through generations
            and reimagined for India's leading enterprises.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {storyMilestones.map((m, i) => (
              <button
                key={`filter-pill-${i}`}
                type="button"
                onClick={() => scrollToMilestone(i)}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
                  activeEra === i
                    ? "bg-[#113858] text-white shadow-md shadow-[#113858]/15"
                    : "border border-[#113858]/10 bg-[#F5F8FA] text-[#113858]/70 hover:border-[#113858]/20 hover:bg-white hover:text-[#113858]"
                }`}
              >
                {m.yearShort} · {m.tag}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="pointer-events-none absolute left-4 top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#113858]/10 via-[#113858]/25 to-[#113858]/10 md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-16 sm:space-y-24">
            {storyMilestones.map((item, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={`timeline-item-${index}`}
                  ref={(el) => { milestoneRefs.current[index] = el; }}
                  className="relative"
                >
                  <div className="absolute left-4 top-0 z-20 -translate-x-1/2 md:left-1/2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#113858] text-[11px] font-bold text-white shadow-md shadow-[#113858]/20 transition-transform duration-300 hover:scale-110 sm:h-12 sm:w-12 sm:text-[12px]">
                      {item.yearShort}
                    </div>
                  </div>

                  <div className="grid gap-8 pl-12 sm:gap-10 sm:pl-16 md:grid-cols-2 md:items-center md:gap-16 md:pl-0">
                    <div className={isEven ? "md:order-1" : "md:order-2"}>
                      <div className="group relative overflow-hidden rounded-[26px] border border-[#113858]/10 bg-[#F5F8FA] p-2 shadow-[0_12px_36px_rgba(17,56,88,0.06)] transition-all duration-500 hover:-translate-y-1 hover:border-[#113858]/20 hover:shadow-[0_20px_50px_rgba(17,56,88,0.12)] sm:rounded-[30px] sm:p-2.5">
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] sm:rounded-[24px]">
                          {item.isEmblem ? (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-[#113858] p-8 text-center text-white">
                              <img
                                src={item.image}
                                alt="Cottson Emblem"
                                className="h-28 w-28 object-contain drop-shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-transform duration-700 group-hover:scale-105 sm:h-36 sm:w-36 brightness-0 invert"
                              />
                              <span className="mt-4 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                                Modern Brand Identity
                              </span>
                            </div>
                          ) : (
                            <>
                              <img
                                src={item.image}
                                alt={item.caption}
                                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#113858]/85 via-transparent to-transparent opacity-80" />
                            </>
                          )}

                          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-white/70">
                              {item.location}
                            </span>
                            <p className="mt-0.5 text-[13px] font-medium text-white sm:text-[14px]">
                              {item.caption}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={isEven ? "md:order-2" : "md:order-1"}>
                      <article className="group rounded-[26px] border border-[#113858]/[0.08] bg-[#F5F8FA] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#113858]/15 hover:bg-white hover:shadow-[0_16px_40px_rgba(17,56,88,0.08)] sm:rounded-[30px] sm:p-9 lg:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#113858]/10 bg-white px-3.5 py-1 text-[11px] font-semibold text-[#113858]">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{item.period}</span>
                          </div>

                          <span className="rounded-full bg-[#113858]/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#113858]/60">
                            {item.tag}
                          </span>
                        </div>

                        <h3 className="mt-4 text-[22px] font-semibold leading-[1.25] tracking-[-0.03em] text-[#113858] sm:text-[26px] lg:text-[28px]">
                          {item.title}
                        </h3>

                        <p className="mt-4 text-[13.5px] leading-[1.85] text-[#607487] sm:text-[14.5px]">
                          {item.body}
                        </p>

                        <div className="mt-6 border-t border-[#113858]/10 pt-4">
                          <span className="inline-flex items-center gap-2 text-[11.5px] font-medium text-[#113858]/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#113858]/40" />
                            {item.highlight}
                          </span>
                        </div>
                      </article>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisionMission() {
  return (
    <section className="bg-white px-5 py-20 sm:px-6 md:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-[1380px]">
        <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-14">
          <EyebrowPill text="What drives us" />

          <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[42px] lg:text-[48px]">
            Our Vision
            <span className="text-[#113858]/45"> & Mission</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[570px] text-[13px] leading-[1.75] text-[#607487] sm:text-[14px]">
            The principles that guide every garment we create and every relationship we build.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="group overflow-hidden rounded-[24px] border border-[#113858]/[0.08] bg-[#F5F8FA] transition-all duration-300 hover:-translate-y-[3px] hover:border-[#113858]/15 hover:bg-white hover:shadow-[0_14px_40px_rgba(17,56,88,0.08)] sm:rounded-[28px]">
            <div className="flex items-center p-8 sm:p-10 lg:p-14">
              <div className="max-w-xl">
                <div className="mb-6 flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E9F0F5] text-[#113858] transition-all duration-300 group-hover:bg-[#113858] group-hover:text-white">
                  <Eye size={20} strokeWidth={1.8} />
                </div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#113858]/40">
                  01 / Our Vision
                </p>
                <h3 className="mb-5 text-[28px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[34px] lg:text-[40px]">
                  Our Vision
                </h3>
                <p className="text-[13.5px] leading-[1.8] text-[#607487] sm:text-[14px]">
                  To redefine professional attire for the modern executive through thoughtful design, dependable craftsmanship, and a premium clothing experience.
                </p>
              </div>
            </div>
          </div>

          <div className="group overflow-hidden rounded-[24px] border border-[#113858]/[0.08] bg-[#F5F8FA] transition-all duration-300 hover:-translate-y-[3px] hover:border-[#113858]/15 hover:bg-white hover:shadow-[0_14px_40px_rgba(17,56,88,0.08)] sm:rounded-[28px]">
            <div className="flex items-center p-8 sm:p-10 lg:p-14">
              <div className="max-w-xl">
                <div className="mb-6 flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E9F0F5] text-[#113858] transition-all duration-300 group-hover:bg-[#113858] group-hover:text-white">
                  <Target size={20} strokeWidth={1.8} />
                </div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#113858]/40">
                  02 / Our Mission
                </p>
                <h3 className="mb-5 text-[28px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[34px] lg:text-[40px]">
                  Our Mission
                </h3>
                <p className="text-[13.5px] leading-[1.8] text-[#607487] sm:text-[14px]">
                  To deliver high-quality, custom-made corporate apparel while building lasting relationships through consistency, service, and textile expertise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutStats() {
  return (
    <section className="bg-[#F5F8FA] px-5 py-20 sm:px-6 md:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-[1380px]">
        <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-14">
          <EyebrowPill text="Our journey" />

          <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[42px] lg:text-[48px]">
            Stats
            <span className="text-[#113858]/45"> About Us</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-[1.75] text-[#607487] sm:text-[14px]">
            Key milestones and numbers that define our growth and commitment to quality.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.id}
                className="group flex min-h-[190px] flex-col justify-between rounded-[24px] border border-[#113858]/[0.08] bg-white p-5 transition-all duration-300 hover:-translate-y-[3px] hover:border-[#113858]/15 hover:shadow-[0_14px_40px_rgba(17,56,88,0.08)] sm:min-h-[210px] sm:p-6 lg:min-h-[225px]"
              >
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#E9F0F5] text-[#113858] transition-all duration-300 group-hover:bg-[#113858] group-hover:text-white">
                  <Icon size={18} strokeWidth={1.8} />
                </div>

                <div>
                  <span className="text-[30px] font-semibold leading-none tracking-[-0.055em] text-[#113858] sm:text-[36px] lg:text-[40px]">
                    <AnimatedCounter value={stat.value} />
                  </span>

                  <p className="mt-2 text-[11px] font-medium text-[#607487] sm:text-[12px]">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhatMakesUsUnique() {
  return (
    <section className="bg-white px-5 py-20 sm:px-6 md:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-[1380px]">
        <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-14">
          <EyebrowPill text="The Cottson difference" />

          <h2 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#113858] sm:text-[42px] lg:text-[48px]">
            What Makes Us
            <span className="text-[#113858]/45"> Unique</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[580px] text-[13px] leading-[1.75] text-[#607487] sm:text-[14px]">
            Four pillars that set Cottson Clothing apart in the corporate apparel industry.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
          {uniquePoints.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="group flex flex-col gap-6 rounded-[24px] border border-[#113858]/[0.08] bg-[#F5F8FA] p-6 transition-all duration-300 hover:-translate-y-[3px] hover:border-[#113858]/15 hover:bg-white hover:shadow-[0_14px_40px_rgba(17,56,88,0.08)] sm:p-7 lg:p-8"
              >
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#E9F0F5] text-[#113858] transition-all duration-300 group-hover:bg-[#113858] group-hover:text-white">
                  <Icon size={18} strokeWidth={1.8} />
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#113858]/40">
                    {String(item.id).padStart(2, "0")}
                  </p>

                  <h3 className="text-[21px] font-semibold leading-[1.2] tracking-[-0.035em] text-[#113858] lg:text-[23px]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-[13px] leading-[1.7] text-[#607487]">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#113858]">
      {/* 1. Scrollytelling Heritage Timeline */}
      <HowItAllBegan />

      {/* 2. Video Reels Carousel */}
      <AboutReels />

      {/* 3. Vision & Mission Cards */}
      <VisionMission />

      {/* 4. Stats Counter Row */}
      <AboutStats />

      {/* 5. What Makes Us Unique */}
      <WhatMakesUsUnique />

      {/* 6. Client Logo Carousel */}
      <ClientLogoCarousel />

      {/* 7. WhatsApp Consultation CTA */}
      <WhatsAppCTA />
    </main>
  );
}
