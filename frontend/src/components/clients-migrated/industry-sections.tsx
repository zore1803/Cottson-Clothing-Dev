import React from "react";

interface Review {
  quote: string;
  name: string;
  company: string;
}

function IndustrySection({
  id,
  title,
  logos,
  reviews,
  bgAlt = false,
}: {
  id: string;
  title: string;
  logos: string[];
  reviews: Review[];
  bgAlt?: boolean;
}) {
  return (
    <section
      id={id}
      className={`
        px-6 py-20
        sm:px-8 sm:py-24
        lg:px-12 lg:py-28
        ${bgAlt ? "bg-[#F5F8FA]" : "bg-white"}
      `}
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="max-w-[700px]">
          <h2
            className="
              break-words
              text-[24px] font-semibold
              leading-[1.15]
              tracking-[-0.03em]
              text-[#113858]
              sm:text-[28px]
              sm:leading-[1.1]
              lg:whitespace-nowrap
              lg:text-[34px]
              lg:leading-[1.08]
              lg:tracking-[-0.04em]
            "
          >
            {title}
          </h2>
        </div>

        {/* Client Logos */}
        <div
          className="
            mt-14
            grid grid-cols-2
            items-center
            gap-4
            sm:grid-cols-3
            lg:grid-cols-5
          "
        >
          {logos.map((logo, index) => (
            <div
              key={logo}
              className="
                aspect-square
                flex items-center justify-center
                rounded-[16px]
                border border-[#113858]/10
                bg-white
                p-4
                transition-all duration-300
                hover:border-[#113858]/20
                hover:shadow-[0_8px_25px_rgba(17,56,88,0.06)]
              "
            >
              <div className="flex h-[75%] w-[75%] items-center justify-center">
                <img
                  src={`/${logo.replace(/^\//, "")}`}
                  alt={`${title} client ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reviews.map((review, index) => (
              <div
                key={index}
                className="
                  min-w-0
                  rounded-[20px]
                  border border-[#113858]/[0.06]
                  bg-white
                  p-7
                  sm:p-8
                  shadow-sm
                "
              >
                <p
                  className="
                    break-words
                    text-[16px]
                    leading-[1.65]
                    tracking-[-0.01em]
                    text-[#113858]
                    sm:text-[17px]
                  "
                >
                  “{review.quote}”
                </p>

                <div className="mt-7 min-w-0">
                  <p
                    className="
                      break-words
                      text-[12px]
                      font-semibold
                      text-[#113858]
                    "
                  >
                    {review.name}
                  </p>

                  <p
                    className="
                      mt-1
                      break-words
                      text-[11px]
                      text-[#607487]
                    "
                  >
                    {review.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const standardReviews = (industryName: string): Review[] => [
  {
    quote:
      "The quality and finish of the apparel were excellent. The entire process was smooth and the final products matched our brand perfectly.",
    name: "Client Partner",
    company: `${industryName} Brand`,
  },
  {
    quote:
      "From customization to delivery, the experience was seamless. The team understood our requirements and delivered exactly what we needed.",
    name: "Operations Lead",
    company: `${industryName} Enterprise`,
  },
];

export function RetailClients() {
  return (
    <IndustrySection
      id="industry-retail"
      title="Retail, Fashion & Consumer Brands"
      logos={["ORRA.png", "zouk.png", "primarcpecan.png", "doms.png"]}
      reviews={standardReviews("Retail")}
    />
  );
}

export function HospitalityClients() {
  return (
    <IndustrySection
      id="industry-hospitality"
      title="Hospitality, F&B & Events"
      logos={[
        "glocal.png",
        "ghostkitchens.png",
        "foodlink.png",
        "chinabistro.png",
        "artofdum.png",
        "leafyboi.png",
        "indiabistro.png",
        "jade.png",
      ]}
      reviews={standardReviews("Hospitality")}
      bgAlt
    />
  );
}

export function HealthcareClients() {
  return (
    <IndustrySection
      id="industry-healthcare"
      title="Healthcare & Pharmaceuticals"
      logos={["glocutis.png", "uniclan.png", "lupin.png", "cipla.png"]}
      reviews={standardReviews("Healthcare")}
    />
  );
}

export function EnergyClients() {
  return (
    <IndustrySection
      id="industry-energy"
      title="Energy, Infrastructure & Environmental"
      logos={["tna.png", "essens.png", "excelsis.png", "supreme.png"]}
      reviews={standardReviews("Energy")}
      bgAlt
    />
  );
}

export function ManufacturingClients() {
  return (
    <IndustrySection
      id="industry-manufacturing"
      title="Manufacturing & Industrial"
      logos={[
        "drychem.png",
        "aurumprop.png",
        "walplast.png",
        "tubestar.png",
        "antony.png",
        "chemco.png",
        "peterlacke.png",
        "OS.png",
        "hoshizaki.png",
        "western.png",
        "insteel.png",
        "aurum.png",
      ]}
      reviews={standardReviews("Manufacturing")}
    />
  );
}

export function TechnologyClients() {
  return (
    <IndustrySection
      id="industry-technology"
      title="Technology, Services & Fintech"
      logos={["stampmyvisa.png", "pinelabs.png", "benow.png", "khaitan.png"]}
      reviews={standardReviews("Technology")}
      bgAlt
    />
  );
}
