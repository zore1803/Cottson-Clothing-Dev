export function LeafyBoiSection() {
  return (
    <section
      className="
        mx-4 my-6
        overflow-hidden
        rounded-[32px]
        bg-[#F5F8FA]
        px-6 py-20
        sm:mx-6 sm:px-8 sm:py-24
        lg:mx-8 lg:px-12 lg:py-28
      "
    >
      <div
        className="
          mx-auto
          grid max-w-[1200px]
          grid-cols-1
          items-center
          gap-12
          lg:grid-cols-[0.8fr_1.2fr]
          lg:gap-16
        "
      >
        <div className="min-w-0 max-w-[520px]">
          <p
            className="
              mb-4
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-[#607487]
            "
          >
            Client Story
          </p>

          <h2
            className="
              break-words
              text-[38px]
              font-semibold
              leading-[1.08]
              tracking-[-0.04em]
              text-[#113858]
              sm:text-[48px]
            "
          >
            Leafy Boi
          </h2>

          <p
            className="
              mt-6
              break-words
              text-[15px]
              leading-[1.75]
              text-[#607487]
              sm:text-[16px]
            "
          >
            We worked with Leafy Boi to create custom apparel that
            reflects their brand identity while giving their team
            a consistent and recognisable look.
          </p>

          <p
            className="
              mt-4
              break-words
              text-[15px]
              leading-[1.75]
              text-[#607487]
              sm:text-[16px]
            "
          >
            From the initial requirements to the final production,
            every detail was designed around their team and brand.
          </p>
        </div>

        <div
          className="
            relative
            aspect-[16/10]
            w-full
            overflow-hidden
            rounded-[24px]
            bg-[#113858]
            shadow-[0_16px_45px_rgba(17,56,88,0.12)]
            flex items-center justify-center p-8
          "
        >
          <img
            src="/leafyboi.png"
            alt="Leafy Boi Custom Merchandise"
            className="max-h-[80%] max-w-[80%] object-contain drop-shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}

export default LeafyBoiSection;
