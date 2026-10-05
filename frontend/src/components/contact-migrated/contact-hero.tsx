export function ContactHero() {
  return (
    <section className="relative w-full overflow-hidden">
      <img
        src="/contacthero.png"
        alt="Contact Cottson"
        className="block min-h-[580px] w-full object-cover object-center sm:min-h-[640px]"
      />

      <div className="absolute inset-0">
        <div className="mx-auto flex h-full w-full max-w-[1120px] items-center px-5 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex justify-start">
              <img
                src="/cottson_logo.png"
                alt="Cottson Clothing"
                className="h-auto w-[240px] sm:w-[320px] md:w-[360px]"
              />
            </div>

            <p className="max-w-[390px] text-left text-[15px] leading-[1.7] tracking-[-0.01em] text-[#113858] sm:text-[16px] md:text-[17px] font-medium">
              Let&apos;s bring your next corporate wear project to life.
              <br />
              Talk to our team about your requirements and customisation.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:contact@cottson.com"
                className="
                  inline-flex h-[50px] w-full min-w-0 items-center justify-center
                  rounded-full
                  border border-[#113858]/30
                  bg-[#113858] px-7
                  text-[12px] font-semibold uppercase tracking-[0.08em]
                  text-white
                  shadow-md
                  transition-all duration-300
                  hover:-translate-y-0.5
                  hover:bg-[#0b243a]
                  sm:w-auto sm:min-w-[155px]
                "
              >
                Email Us
              </a>

              <a
                href="#query"
                className="
                  inline-flex h-[50px] w-full min-w-0 items-center justify-center
                  rounded-full
                  border border-[#113858]/20
                  bg-white/80 px-7
                  text-[12px] font-semibold uppercase tracking-[0.08em]
                  text-[#113858]
                  backdrop-blur-md
                  transition-all duration-300
                  hover:-translate-y-0.5
                  hover:border-[#113858]
                  hover:bg-white
                  sm:w-auto sm:min-w-[155px]
                "
              >
                Send a Query
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactHero;
