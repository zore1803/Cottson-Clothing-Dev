import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const needs = [
  {
    id: 1,
    title: "Events & Exhibitions",
    description:
      "Custom tees and polos for conferences, exhibitions, product launches and corporate events.",
    image: "",
    button: "Order for Your Event",
    href: "/contact",
  },
  {
    id: 2,
    title: "Everyday Office Wear",
    description:
      "Keep your team looking sharp every day with customised shirts, polos and professional workwear.",
    image: "",
    button: "Get a Quote for Your Team",
    href: "/contact",
  },
  {
    id: 3,
    title: "Team Outings & Offsites",
    description:
      "Matching custom apparel designed for team outings, company offsites and memorable experiences.",
    image: "",
    button: "Outfit Your Next Offsite",
    href: "/contact",
  },
];

function CorporateNeedCard({ item }: { item: (typeof needs)[0] }) {
  return (
    <article className="group min-w-0">
      <div
        className="
          relative
          aspect-[1.35/1]
          overflow-hidden
          rounded-[24px]
          bg-[#F3F6F8]
          sm:rounded-[28px]
        "
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              ease-out
              group-hover:scale-[1.035]
            "
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/60" />
        )}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[#113858]/0
            transition-colors
            duration-500
            group-hover:bg-[#113858]/10
          "
        />

        <div
          className="
            absolute
            right-5
            top-5
            flex
            h-[42px]
            w-[42px]
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-white
            text-[#113858]
            opacity-0
            translate-y-2
            transition-all
            duration-300
            group-hover:translate-y-0
            group-hover:opacity-100
            shadow-md
          "
        >
          <ArrowUpRight size={17} strokeWidth={2} />
        </div>
      </div>

      <div className="px-2 pt-6 text-center">
        <h3
          className="
            break-words
            text-[21px]
            font-bold
            leading-[1.2]
            tracking-[-0.02em]
            text-[#113858]
            lg:text-[23px]
          "
        >
          {item.title}
        </h3>

        <p
          className="
            mx-auto
            mt-3
            max-w-[390px]
            break-words
            text-[13px]
            leading-relaxed
            text-[#607487]
            sm:text-[14px]
          "
        >
          {item.description}
        </p>

        <Link
          href={item.href}
          className="
            group/button
            mx-auto
            mt-5
            inline-flex
            h-[44px]
            max-w-full
            items-center
            justify-center
            gap-2
            whitespace-nowrap
            rounded-full
            border
            border-[#113858]
            bg-[#113858]
            px-6
            text-[12.5px]
            font-semibold
            !text-white
            text-white
            transition-all
            duration-300
            ease-out
            hover:-translate-y-[2px]
            hover:bg-[#0b243a]
            hover:!text-white
            hover:text-white
            hover:shadow-[0_8px_22px_rgba(17,56,88,0.18)]
          "
          style={{ color: "#ffffff" }}
        >
          <span className="!text-white text-white">{item.button}</span>

          <ArrowUpRight
            size={14}
            strokeWidth={2.2}
            className="
              shrink-0
              !text-white
              text-white
              transition-transform
              duration-300
              group-hover/button:translate-x-[2px]
              group-hover/button:-translate-y-[2px]
            "
            style={{ color: "#ffffff" }}
          />
        </Link>
      </div>
    </article>
  );
}

export function CorporateNeeds() {
  return (
    <section
      id="occasions"
      className="
        bg-white
        px-5
        py-20
        sm:px-6
        md:py-24
        lg:px-8
        lg:py-28
      "
    >
      <div
        className="
          mx-auto
          mb-12
          max-w-[900px]
          text-center
          md:mb-14
        "
      >
        <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
          Made for every occasion
        </p>

        <h2
          className="
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
          Custom clothing for
          <span className="text-[#113858]/45">
            {" "}every corporate need.
          </span>
        </h2>

        <p
          className="
            mx-auto
            mt-4
            max-w-[620px]
            break-words
            text-[14px]
            leading-relaxed
            text-[#607487]
            sm:text-[15px]
          "
        >
          From everyday office wear to important events and team
          experiences, create apparel that keeps your people looking
          consistent and your brand recognisable.
        </p>
      </div>

      <div
        className="
          mx-auto
          grid
          max-w-[1380px]
          grid-cols-1
          gap-x-6
          gap-y-12
          md:grid-cols-3
          lg:gap-x-8
        "
      >
        {needs.map((item) => (
          <CorporateNeedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default CorporateNeeds;
