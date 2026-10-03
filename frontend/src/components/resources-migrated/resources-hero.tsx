export function ResourcesHero() {
  return (
    <section
      id="resources-hero"
      className="
        relative
        min-h-[70vh]
        overflow-hidden
        bg-white
        px-6
        pb-20
        pt-[120px]
        sm:px-8
        sm:pb-24
        sm:pt-[140px]
        lg:px-12
        lg:pb-28
        lg:pt-[160px]
      "
    >
      <div className="relative mx-auto max-w-[1120px]">
        <div className="max-w-[900px]">
          <h1
            className="
              max-w-[900px]
              text-[44px]
              font-semibold
              leading-[1.05]
              tracking-[-0.05em]
              text-[#113858]
              sm:text-[60px]
              lg:text-[76px]
            "
          >
            Ideas, insights & resources
            <br />
            <span className="text-[#113858]/40">
              for better corporate wear.
            </span>
          </h1>

          <p
            className="
              mt-7
              max-w-[650px]
              text-[15px]
              leading-[1.75]
              text-[#607487]
              sm:text-[17px]
            "
          >
            Explore practical guides, insights and inspiration to help you
            make better decisions about corporate apparel, customisation,
            branding and team wear.
          </p>
        </div>

        <div
          className="
            mt-16
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {/* Guides */}
          <div
            className="
              rounded-[22px]
              border border-[#113858]/10
              bg-white
              p-6
              sm:p-7
              transition-colors duration-300
              hover:bg-[#113858]
              group
            "
          >
            <span
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              01
            </span>

            <h3
              className="
                mt-10
                text-[22px]
                font-semibold
                tracking-[-0.03em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              Guides
            </h3>

            <p
              className="
                mt-3
                text-[13px]
                leading-[1.7]
                text-[#113858]/80
                transition-colors duration-300
                group-hover:text-white/80
              "
            >
              Practical guides to help you choose, customise and manage
              corporate apparel.
            </p>
          </div>

          {/* Insights */}
          <div
            className="
              rounded-[22px]
              border border-[#113858]/10
              bg-white
              p-6
              sm:p-7
              transition-colors duration-300
              hover:bg-[#113858]
              group
            "
          >
            <span
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              02
            </span>

            <h3
              className="
                mt-10
                text-[22px]
                font-semibold
                tracking-[-0.03em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              Insights
            </h3>

            <p
              className="
                mt-3
                text-[13px]
                leading-[1.7]
                text-[#113858]/80
                transition-colors duration-300
                group-hover:text-white/80
              "
            >
              Ideas and insights on branding, apparel trends and building a
              consistent team identity.
            </p>
          </div>

          {/* Inspiration */}
          <div
            className="
              rounded-[22px]
              border border-[#113858]/10
              bg-white
              p-6
              sm:p-7
              transition-colors duration-300
              hover:bg-[#113858]
              group
            "
          >
            <span
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              03
            </span>

            <h3
              className="
                mt-10
                text-[22px]
                font-semibold
                tracking-[-0.03em]
                text-[#113858]
                transition-colors duration-300
                group-hover:text-white
              "
            >
              Inspiration
            </h3>

            <p
              className="
                mt-3
                text-[13px]
                leading-[1.7]
                text-[#113858]/80
                transition-colors duration-300
                group-hover:text-white/80
              "
            >
              Discover ideas for colours, styles, customisation and corporate
              team apparel.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResourcesHero;
