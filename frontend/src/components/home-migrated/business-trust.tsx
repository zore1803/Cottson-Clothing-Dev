import { Building2, Clock3, PackageCheck, Boxes } from "lucide-react";

const stats = [
  {
    id: 1,
    icon: Building2,
    value: "250+",
    label: "Businesses Served",
  },
  {
    id: 2,
    icon: Clock3,
    value: "7–10",
    suffix: "Days",
    label: "Typical Delivery",
  },
  {
    id: 3,
    icon: Boxes,
    value: "8K+",
    label: "Production Capacity",
  },
  {
    id: 4,
    icon: PackageCheck,
    value: "25",
    suffix: "Pieces",
    label: "Minimum Order",
  },
];

export function BusinessTrust() {
  return (
    <section
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
      <div className="mx-auto max-w-[1380px]">
        <div
          className="
            mx-auto
            mb-12
            max-w-[760px]
            text-center
            md:mb-14
          "
        >
          <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
            Built for business
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
            Made to Handle
            <span className="text-[#113858]/45">
              {" "}teams of every size.
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-4
              max-w-[570px]
              text-[14px]
              leading-relaxed
              text-[#607487]
              sm:text-[15px]
            "
          >
            From growing teams to large corporate requirements,
            our production process is built around reliable quality,
            customisation and delivery.
          </p>
        </div>

        <div
          className="
            grid
            grid-cols-1
            gap-3
            min-[380px]:grid-cols-2
            md:grid-cols-4
            md:gap-4
          "
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.id}
                className="
                  group
                  flex
                  min-h-[190px]
                  min-w-0
                  flex-col
                  justify-between
                  rounded-[24px]
                  border
                  border-[#113858]/[0.08]
                  bg-[#F5F8FA]
                  p-5
                  transition-all
                  duration-300
                  hover:-translate-y-[3px]
                  hover:border-[#113858]/15
                  hover:bg-white
                  hover:shadow-[0_14px_40px_rgba(17,56,88,0.08)]
                  sm:min-h-[210px]
                  sm:p-6
                  lg:min-h-[225px]
                "
              >
                <div
                  className="
                    flex
                    h-[42px]
                    w-[42px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#E9F0F5]
                    text-[#113858]
                    transition-all
                    duration-300
                    group-hover:bg-[#113858]
                    group-hover:text-white
                  "
                >
                  <Icon size={18} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-end gap-1.5">
                    <span
                      className="
                        break-words
                        text-[30px]
                        font-semibold
                        leading-none
                        tracking-[-0.02em]
                        text-[#113858]
                        sm:text-[36px]
                        lg:text-[40px]
                      "
                    >
                      {stat.value}
                    </span>

                    {stat.suffix && (
                      <span className="mb-[3px] text-[11px] font-semibold text-[#113858]/45">
                        {stat.suffix}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 break-words text-[11px] font-medium text-[#607487] sm:text-[12px]">
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

export default BusinessTrust;
