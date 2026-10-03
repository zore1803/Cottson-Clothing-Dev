"use client";

import React, { useRef, useState, useEffect } from "react";
import { useInView } from "@/hooks/use-in-view";

const reelVideos = [
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330914/IMG_6707.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330941/IMG_5084.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330971/IMG_3062.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330952/IMG_3583.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330928/IMG_5118.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330904/IMG_6650.mp4",
  "https://res.cloudinary.com/tpxo8m6a/video/upload/v1790330596/BRAND_PROCESS.mp4",
];

function getOptimizedVideoUrl(url: string) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/video/upload/")) {
    return url.replace(
      /\/video\/upload\/([^/]*\/)?/,
      "/video/upload/q_auto:eco,w_360,br_700k,vc_auto/"
    );
  }
  return url;
}

function getPosterUrl(url: string) {
  if (!url || typeof url !== "string") return undefined;
  if (url.includes("/video/upload/")) {
    return url
      .replace(
        /\/video\/upload\/([^/]*\/)?/,
        "/video/upload/so_0,q_auto:eco,f_auto,w_360/"
      )
      .replace(/\.mp4$/i, ".jpg");
  }
  return undefined;
}

function ReelCard({ video, sectionInView }: { video: string; sectionInView: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const optimizedVideo = getOptimizedVideoUrl(video);
  const poster = getPosterUrl(video);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !sectionInView) {
      setIsVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: "80px 20px",
        threshold: 0.05,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionInView]);

  const shouldPlay = sectionInView && (isVisible || isHovered);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (shouldPlay) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      videoEl.pause();
    }
  }, [shouldPlay]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="
        group relative
        aspect-[9/16] w-[260px] shrink-0
        overflow-hidden rounded-[24px]
        border border-[#113858]/[0.08]
        bg-[#E9F0F5]
        sm:w-[280px] sm:rounded-[28px]
        [transform:translateZ(0)]
      "
    >
      <img
        src={poster}
        alt="Cottson behind the scenes"
        loading="lazy"
        decoding="async"
        className={`
          absolute inset-0 h-full w-full object-cover
          transition-opacity duration-300
          ${shouldPlay ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      />

      {shouldPlay && (
        <video
          ref={videoRef}
          src={optimizedVideo}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          className="
            relative h-full w-full object-cover
            transition-transform duration-700 ease-out
            group-hover:scale-[1.04]
          "
        />
      )}

      <div
        className="
          pointer-events-none absolute inset-x-0 bottom-0
          h-28 bg-gradient-to-t from-[#113858]/25 to-transparent
          opacity-0 transition-opacity duration-500
          group-hover:opacity-100
        "
      />
    </div>
  );
}

export function AboutReels() {
  const { ref: sectionRef, isInView } = useInView({ rootMargin: "150px" });

  const reelItems = [
    ...reelVideos,
    ...reelVideos,
  ];

  return (
    <section ref={sectionRef} className="overflow-hidden bg-[#F5F8FA] py-20 md:py-24 lg:py-28">
      <div className="mx-auto mb-12 max-w-[1380px] px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
              Behind The Scenes
            </p>
            <h2
              className="
                text-[34px] font-bold leading-[1.12]
                tracking-[-0.025em] text-[#113858]
                sm:text-[42px] lg:text-[48px]
              "
            >
              Our Story
              <br />
              <span className="text-[#113858]/45">in Motion</span>
            </h2>
          </div>

          <p
            className="
              max-w-sm text-[13px] leading-relaxed text-[#607487]
              sm:text-[14px]
            "
          >
            A closer look at the people, process, craftsmanship, and world
            behind Cottson Clothing.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex w-max gap-4 will-change-transform [transform:translateZ(0)] hover:[animation-play-state:paused]"
          style={{
            animation: "reelMarquee 90s linear infinite",
            animationPlayState: isInView ? "running" : "paused",
          }}
        >
          <div className="flex shrink-0 gap-4">
            {reelItems.map((video, index) => (
              <ReelCard
                key={`reel-track1-${index}`}
                video={video}
                sectionInView={isInView}
              />
            ))}
          </div>

          <div className="flex shrink-0 gap-4" aria-hidden="true">
            {reelItems.map((video, index) => (
              <ReelCard
                key={`reel-track2-${index}`}
                video={video}
                sectionInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutReels;
