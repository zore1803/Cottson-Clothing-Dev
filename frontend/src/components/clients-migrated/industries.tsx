const industries = [
  {
    id: "retail",
    number: "01",
    title: "Retail, Fashion &\nConsumer Brands",
    image: "/cw1.png",
    target: "#industry-retail",
  },
  {
    id: "hospitality",
    number: "02",
    title: "Hospitality, F&B\n& Events",
    image: "/cw2.png",
    target: "#industry-hospitality",
  },
  {
    id: "healthcare",
    number: "03",
    title: "Healthcare &\nPharmaceuticals",
    image: "/cw3.png",
    target: "#industry-healthcare",
  },
  {
    id: "energy",
    number: "04",
    title: "Energy, Infrastructure\n& Environmental",
    image: "/cw4.png",
    target: "#industry-energy",
  },
  {
    id: "manufacturing",
    number: "05",
    title: "Manufacturing &\nIndustrial",
    image: "/cw5.png",
    target: "#industry-manufacturing",
  },
  {
    id: "technology",
    number: "06",
    title: "Technology, Services\n& Fintech",
    image: "/clothing-rack.png",
    target: "#industry-technology",
  },
];

export function Industries() {
  return (
    <section
      id="industries"
      className="
        bg-[#F5F8FA]
        px-6 py-20
        sm:px-8 sm:py-24
        lg:px-12 lg:py-28
      "
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 max-w-[650px]">
          <p
            className="
              mb-4 text-[11px]
              font-semibold uppercase
              tracking-[0.18em]
              text-[#607487]
            "
          >
            Industries
          </p>

          <h2
            className="
              break-words
              text-[32px] font-semibold
              leading-[1.08]
              tracking-[-0.04em]
              text-[#113858]
              sm:text-[48px]
            "
          >
            Apparel made for
            <br />
            <span className="text-[#113858]/50">
              every kind of team.
            </span>
          </h2>

          <p
            className="
              mt-5 max-w-[560px]
              break-words
              text-[14px] leading-[1.7]
              text-[#607487]
              sm:text-[15px]
            "
          >
            From customer-facing teams to corporate workplaces,
            we create custom apparel tailored to the way your
            business works.
          </p>
        </div>

        <div
          className="
            grid grid-cols-1 gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {industries.map((industry) => (
            <a
              key={industry.id}
              href={industry.target}
              className="
                group relative
                h-[300px]
                overflow-hidden
                rounded-[22px]
                bg-[#113858]
              "
            >
              <img
                src={industry.image}
                alt={industry.title.replace("\n", " ")}
                loading="lazy"
                decoding="async"
                className="
                  absolute inset-0
                  h-full w-full
                  object-cover
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-105
                "
              />

              <div
                className="
                  absolute inset-0
                  bg-[#113858]/55
                  transition-colors
                  duration-300
                  group-hover:bg-[#113858]/70
                "
              />

              <div
                className="
                  absolute inset-0
                  flex flex-col
                  justify-end
                  p-6
                "
              >
                <div className="min-w-0">
                  <h3
                    className="
                      whitespace-pre-line
                      break-words
                      text-[23px]
                      font-semibold
                      leading-[1.12]
                      tracking-[-0.025em]
                      text-white
                    "
                  >
                    {industry.title}
                  </h3>

                  <span
                    className="
                      mt-4 inline-flex
                      whitespace-nowrap
                      text-[11px]
                      font-medium
                      text-white/80
                    "
                  >
                    View Clients →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Industries;
