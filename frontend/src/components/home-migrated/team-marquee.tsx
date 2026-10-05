"use client";

import { useState, useEffect } from "react";
import { useInView } from "@/hooks/use-in-view";

const TEAM_IMAGES_JSON_URL =
  "https://res.cloudinary.com/tpxo8m6a/image/list/team_images.json";

function optimizeTeamUrl(url: string, width = 450) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/image/upload/")) {
    return url.replace(
      /\/image\/upload\/([^/]*\/)?/,
      `/image/upload/f_auto,q_auto:eco,w_${width},c_limit/`
    );
  }
  return url;
}

interface TeamItem {
  id: string;
  name: string;
  url: string;
}

function formatTeamItem(item: any): TeamItem {
  const ext = item.format || "jpg";
  return {
    id: item.public_id,
    name: item.public_id.replace(/[_-]/g, " ").trim(),
    url: `https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto:eco,w_450,c_limit/v${item.version}/${item.public_id}.${ext}`,
  };
}

const initialRowOne: TeamItem[] = [
  {
    id: "Qodenext_team_images",
    name: "Qodenext team images",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413275/Qodenext_team_images.jpg",
  },
  {
    id: "Uniclan_Team_Images",
    name: "Uniclan Team Images",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413275/Uniclan_Team_Images.jpg",
  },
  {
    id: "Uniclan_Team_Images2",
    name: "Uniclan Team Images 2",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413275/Uniclan_Team_Images2.jpg",
  },
  {
    id: "Uniclan_Images",
    name: "Uniclan Images",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413275/Uniclan_Images.jpg",
  },
  {
    id: "Qodenext_Team_Image",
    name: "Qodenext Team Image",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413274/Qodenext_Team_Image.gif",
  },
  {
    id: "CJS_Image",
    name: "CJS Image",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413274/CJS_Image.jpg",
  },
  {
    id: "Chemco_Team_Image1",
    name: "Chemco Team Image 1",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413274/Chemco_Team_Image1.jpg",
  },
  {
    id: "Chemco_Team_Image",
    name: "Chemco Team Image",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413274/Chemco_Team_Image.jpg",
  },
  {
    id: "MaxSpare_Office_Image",
    name: "MaxSpare Office Image",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413274/MaxSpare_Office_Image.jpg",
  },
];

const initialRowTwo: TeamItem[] = [
  {
    id: "Aurum_Tean",
    name: "Aurum Team",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/Aurum_Tean.jpg",
  },
  {
    id: "Aurum_Team_3",
    name: "Aurum Team 3",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/Aurum_Team_3.jpg",
  },
  {
    id: "Aurum_Team_2",
    name: "Aurum Team 2",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/Aurum_Team_2.jpg",
  },
  {
    id: "2-19-2",
    name: "2 19 2",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/2-19-2.png",
  },
  {
    id: "1742991027978",
    name: "Team 1742991027978",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/1742991027978.jpg",
  },
  {
    id: "Max_Space_Office_Image",
    name: "Max Space Office Image",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/Max_Space_Office_Image.jpg",
  },
  {
    id: "IMG_6087-Copy",
    name: "IMG 6087 Copy",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413273/IMG_6087-Copy.jpg",
  },
  {
    id: "1716135610941",
    name: "Team 1716135610941",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413272/1716135610941.jpg",
  },
  {
    id: "04",
    name: "Team 04",
    url: "https://res.cloudinary.com/tpxo8m6a/image/upload/f_auto,q_auto,w_800/v1790413272/04.jpg",
  },
];

function TeamImage({
  item,
  index,
  onEnter,
  onLeave,
}: {
  item: TeamItem;
  index: number;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const src = optimizeTeamUrl(item.url, 450);
  const name = item.name || `Cottson team ${index + 1}`;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="
        group
        relative
        h-[210px]
        w-[300px]
        shrink-0
        cursor-pointer
        overflow-hidden
        rounded-[22px]
        border border-[#113858]/[0.08]
        bg-[#F3F6F8]
        [transform:translateZ(0)]
        sm:h-[240px]
        sm:w-[350px]
        lg:h-[270px]
        lg:w-[400px]
      "
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        draggable="false"
        className="
          h-full
          w-full
          object-cover
          transition-transform
          duration-700
          ease-out
          group-hover:scale-[1.045]
        "
      />
    </div>
  );
}

function MarqueeRow({
  images,
  direction = "left",
  duration = 45,
  isInView = true,
}: {
  images: TeamItem[];
  direction?: "left" | "right";
  duration?: number;
  isInView?: boolean;
}) {
  const [paused, setPaused] = useState(false);

  const animationName =
    direction === "left" ? "cottsonTeamLeft" : "cottsonTeamRight";

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="
          team-marquee-track
          flex
          w-max
          gap-3
          will-change-transform
          [transform:translateZ(0)]
          sm:gap-4
        "
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
          animationPlayState: !isInView || paused ? "paused" : "running",
        }}
      >
        <div className="flex shrink-0 gap-3 sm:gap-4">
          {images.map((item, index) => (
            <TeamImage
              key={`first-${item.id || index}`}
              item={item}
              index={index}
              onEnter={() => setPaused(true)}
              onLeave={() => setPaused(false)}
            />
          ))}
        </div>

        <div className="flex shrink-0 gap-3 sm:gap-4" aria-hidden="true">
          {images.map((item, index) => (
            <TeamImage
              key={`second-${item.id || index}`}
              item={item}
              index={index}
              onEnter={() => setPaused(true)}
              onLeave={() => setPaused(false)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamMarquee() {
  const [rowOne, setRowOne] = useState<TeamItem[]>(initialRowOne);
  const [rowTwo, setRowTwo] = useState<TeamItem[]>(initialRowTwo);
  const { ref: sectionRef, isInView } = useInView({ rootMargin: "250px" });

  useEffect(() => {
    fetch(TEAM_IMAGES_JSON_URL)
      .then((res) => res.json())
      .then((data) => {
        if (
          data &&
          Array.isArray(data.resources) &&
          data.resources.length >= 18
        ) {
          setRowOne(data.resources.slice(0, 9).map(formatTeamItem));
          setRowTwo(data.resources.slice(9, 18).map(formatTeamItem));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch team_images.json:", err);
      });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="
        overflow-hidden
        bg-white
        pb-24
        pt-12
        md:pb-28
        md:pt-16
      "
    >
      <div
        className="
          mx-auto
          mb-10
          max-w-[1120px]
          px-5
          text-center
          sm:px-6
          md:mb-12
        "
      >
        <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
          Made for teams
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
          One Team.
          <span className="text-[#113858]/45"> One Identity.</span>
        </h2>

        <p
          className="
            mx-auto
            mt-4
            max-w-[540px]
            break-words
            text-[14px]
            leading-relaxed
            text-[#607487]
            sm:text-[15px]
          "
        >
          Custom apparel that brings people together and puts your brand
          proudly at the centre of the team.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <MarqueeRow
          images={rowOne}
          direction="left"
          duration={45}
          isInView={isInView}
        />

        <MarqueeRow
          images={rowTwo}
          direction="right"
          duration={48}
          isInView={isInView}
        />
      </div>
    </section>
  );
}

export default TeamMarquee;
