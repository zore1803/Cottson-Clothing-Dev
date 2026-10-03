import Link from "next/link";
import { ArrowRight, Palette, Shirt } from "lucide-react";

const steps = [
  {
    step: "1",
    title: "Choose Garment",
    desc: "Select styles, fabrics & colours for your team",
  },
  {
    step: "2",
    title: "Add Branding",
    desc: "Custom embroidery, printing or silicone patches",
  },
  {
    step: "3",
    title: "Approve Sample",
    desc: "Digital preview & physical sample approval",
  },
  {
    step: "4",
    title: "Production & Delivery",
    desc: "Bulk manufacturing with Pan-India dispatch",
  },
];

export function DesignStudioSection() {
  return (
    <section
      id="customise"
      className="
        mx-3
        my-10
        overflow-hidden
        rounded-[28px]
        bg-[#E9F0F5]
        sm:mx-5
        sm:rounded-[32px]
        md:mx-7
        md:rounded-[36px]
        lg:mx-10
        lg:rounded-[40px]
        xl:mx-12
      "
    >
      <div
        className="
          mx-auto
          grid
          min-h-[650px]
          max-w-[1450px]
          grid-cols-1
          lg:grid-cols-[0.9fr_1.1fr]
          lg:items-center
        "
      >
        {/* LEFT CONTENT */}
        <div
          className="
            relative
            z-10
            px-6
            pb-12
            pt-14
            sm:px-10
            sm:py-16
            lg:px-14
            lg:py-20
            xl:px-16
          "
        >
          <p className="mb-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
            Design before production
          </p>

          <h2
            className="
              max-w-[620px]
              break-words
              text-[34px]
              font-bold
              leading-[1.12]
              tracking-[-0.025em]
              text-[#113858]
              min-[380px]:text-[38px]
              sm:text-[46px]
              lg:text-[52px]
              xl:text-[58px]
            "
          >
            See your idea
            <br />
            <span className="text-[#113858]/45">
              before we make it.
            </span>
          </h2>

          <p
            className="
              mt-5
              max-w-[530px]
              break-words
              text-[14px]
              leading-relaxed
              text-[#607487]
              sm:text-[15px]
            "
          >
            Visualise your corporate apparel before production.
            Experiment with garment colours, branding and logo
            placement so your team knows exactly what the final
            product will look like.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3 rounded-2xl bg-white/70 p-3.5 border border-[#113858]/5 shadow-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#113858] text-[10px] font-bold text-white">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#113858]">
                    {item.title}
                  </p>
                  <p className="text-[11px] leading-[1.45] text-[#607487] mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/studio"
            className="
              group
              mt-9
              inline-flex
              h-[48px]
              max-w-full
              items-center
              justify-center
              gap-2
              whitespace-nowrap
              rounded-full
              border
              border-[#113858]
              bg-[#113858]
              px-7
              text-[13px]
              font-semibold
              !text-white text-white
              transition-all
              duration-300
              hover:-translate-y-[2px]
              hover:bg-[#0b243a]
              hover:!text-white hover:text-white
              hover:shadow-[0_10px_30px_rgba(17,56,88,0.25)]
            "
            style={{ color: "#ffffff" }}
          >
            <span className="!text-white text-white" style={{ color: "#ffffff" }}>
              Start Your Custom Order
            </span>

            <ArrowRight
              size={15}
              strokeWidth={2.2}
              className="
                shrink-0
                !text-white text-white
                transition-transform
                duration-300
                group-hover:translate-x-1
              "
              style={{ color: "#ffffff" }}
            />
          </Link>
        </div>

        {/* RIGHT VISUAL */}
        <div
          className="
            relative
            min-h-[420px]
            overflow-hidden
            sm:min-h-[480px]
            lg:min-h-[650px]
          "
        >
          <span
            className="
              pointer-events-none
              absolute
              left-1/2
              top-[47%]
              -translate-x-1/2
              -translate-y-1/2
              whitespace-nowrap
              text-[64px]
              font-bold
              tracking-[-0.08em]
              text-[#113858]/[0.035]
              min-[380px]:text-[90px]
              sm:text-[130px]
              lg:text-[150px]
            "
          >
            CUSTOM
          </span>

          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-[280px]
              w-[280px]
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              border
              border-[#113858]/10
              min-[380px]:h-[360px]
              min-[380px]:w-[360px]
              sm:h-[430px]
              sm:w-[430px]
              lg:h-[480px]
              lg:w-[480px]
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-[230px]
              w-[230px]
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-white/45
              min-[380px]:h-[300px]
              min-[380px]:w-[300px]
              sm:h-[370px]
              sm:w-[370px]
              lg:h-[410px]
              lg:w-[410px]
            "
          />

          <img
            src="/polo.png"
            alt="Custom Cottson apparel preview"
            loading="lazy"
            decoding="async"
            className="
              absolute
              bottom-[15px]
              left-1/2
              z-10
              h-[300px]
              w-[255px]
              -translate-x-[42%]
              object-contain
              drop-shadow-[0_25px_30px_rgba(17,56,88,0.14)]
              min-[380px]:h-[390px]
              min-[380px]:w-[330px]
              sm:h-[440px]
              sm:w-[390px]
              lg:bottom-[35px]
              lg:h-[510px]
              lg:w-[440px]
            "
          />

          {/* FLOATING CUSTOMISATION PANEL */}
          <div
            className="
              absolute
              left-[4%]
              top-[15%]
              z-20
              w-[145px]
              rounded-[16px]
              border
              border-white/60
              bg-white/90
              p-3
              shadow-[0_15px_45px_rgba(17,56,88,0.12)]
              backdrop-blur-xl
              min-[380px]:left-[6%]
              min-[380px]:top-[18%]
              min-[380px]:w-[180px]
              min-[380px]:rounded-[20px]
              min-[380px]:p-4
              sm:left-[10%]
              sm:w-[200px]
              lg:left-[3%]
              lg:top-[24%]
            "
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="
                  flex
                  h-[26px]
                  w-[26px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#E9F0F5]
                  text-[#113858]
                  min-[380px]:h-[30px]
                  min-[380px]:w-[30px]
                "
              >
                <Palette size={14} strokeWidth={2} />
              </span>

              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-[#607487]
                  "
                >
                  Garment colour
                </p>

                <p
                  className="
                    mt-[2px]
                    truncate
                    text-[11px]
                    font-semibold
                    text-[#113858]
                  "
                >
                  Choose your shade
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[3px] border-white bg-[#113858] shadow-[0_0_0_1px_rgba(17,56,88,0.15)]" />
              <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[3px] border-white bg-[#FFFFFF] shadow-[0_0_0_1px_rgba(17,56,88,0.15)]" />
              <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-[#9EB3C3]" />
              <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-[#D7E1E8]" />
            </div>
          </div>

          {/* LOGO PLACEMENT CARD */}
          <div
            className="
              absolute
              bottom-[10%]
              right-[4%]
              z-20
              flex
              max-w-[68%]
              items-center
              gap-2
              rounded-[14px]
              border
              border-white/60
              bg-white/90
              px-3
              py-2.5
              shadow-[0_15px_45px_rgba(17,56,88,0.12)]
              backdrop-blur-xl
              min-[380px]:bottom-[13%]
              min-[380px]:right-[5%]
              min-[380px]:max-w-none
              min-[380px]:gap-3
              min-[380px]:rounded-[18px]
              min-[380px]:px-4
              min-[380px]:py-3
              sm:right-[10%]
              lg:bottom-[17%]
              lg:right-[5%]
            "
          >
            <span
              className="
                flex
                h-[30px]
                w-[30px]
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#113858]
                text-white
                min-[380px]:h-[34px]
                min-[380px]:w-[34px]
              "
            >
              <Shirt size={15} strokeWidth={2} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[9px] font-medium text-[#607487]">
                Branding
              </p>
              <p className="mt-[1px] truncate text-[11px] font-semibold text-[#113858]">
                Logo placement
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DesignStudioSection;
