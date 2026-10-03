const images = [
  "/cw1.png",
  "/cw2.png",
  "/cw3.png",
  "/cw4.png",
  "/cw5.png",
];

export function CorporateWearShow() {
  return (
    <section className="bg-white px-6 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-center">
          <h2
            className="
              break-words
              text-[32px]
              font-medium
              leading-[1.08]
              tracking-[-0.04em]
              text-black
              sm:text-[52px]
              lg:text-[62px]
            "
          >
            Setting the Standard for Corporate Wear in India
          </h2>

          <p
            className="
              mx-auto
              mt-6
              max-w-[1100px]
              break-words
              text-[15px]
              leading-[1.7]
              text-black
              sm:text-[17px]
            "
          >
            Let's bring your vision to life! Schedule a live meeting with our
            brand specialist and customise everything fabric, logo, colours
            and more.
          </p>
        </div>

        <div className="mt-16 space-y-7">
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
            <div className="h-[230px] overflow-hidden rounded-[26px] sm:h-[280px] lg:h-[230px]">
              <img
                src={images[0]}
                alt="Corporate team wearing custom apparel"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="h-[230px] overflow-hidden rounded-[26px] sm:h-[280px] lg:h-[230px]">
              <img
                src={images[1]}
                alt="Corporate team wearing custom apparel"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_1fr_0.92fr]">
            <div className="h-[260px] overflow-hidden rounded-[26px] sm:h-[340px] lg:h-[400px]">
              <img
                src={images[2]}
                alt="Corporate team"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="h-[260px] overflow-hidden rounded-[26px] sm:h-[340px] lg:h-[400px]">
              <img
                src={images[3]}
                alt="Corporate team plantation event"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="h-[260px] overflow-hidden rounded-[26px] sm:h-[340px] lg:h-[400px]">
              <img
                src={images[4]}
                alt="Corporate event"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CorporateWearShow;
