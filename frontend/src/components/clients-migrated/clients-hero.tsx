import Link from "next/link";

export function ClientsHero() {
  return (
    <section
      className="
        relative flex min-h-[85vh]
        items-center justify-center
        overflow-hidden
        bg-white px-6 pb-16 pt-[90px]
        text-[#113858]
      "
    >
      <div
        className="
          relative z-10
          mx-auto min-w-0 max-w-[760px]
          text-center
        "
      >
        <p
          className="
            mb-5
            break-words
            text-[11px] font-semibold
            uppercase tracking-[0.18em]
            text-[#607487]
          "
        >
          Our Clients
        </p>

        <h1
          className="
            break-words
            text-[38px] font-semibold
            leading-[1.05]
            tracking-[-0.045em]
            text-black
            sm:text-[58px]
            lg:text-[68px]
          "
        >
          Trusted by teams
          <br />
          <span className="text-black">
            built to stand out.
          </span>
        </h1>

        <p
          className="
            mx-auto mt-7 max-w-[580px]
            break-words
            text-[15px] leading-[1.7]
            text-[#607487]
            sm:text-[16px]
          "
        >
          From growing businesses to established organisations,
          we create corporate apparel that brings teams together
          and keeps every brand looking consistent.
        </p>

        <div
          className="
            mt-9 flex flex-col
            items-center justify-center
            gap-3 sm:flex-row
          "
        >
          <a
            href="#industries"
            className="
              flex h-[46px]
              w-full max-w-[280px]
              items-center justify-center
              whitespace-nowrap
              rounded-full
              border border-[#113858]/20
              bg-white
              px-7
              text-[12px] font-semibold
              text-[#113858]
              transition-all duration-300
              hover:border-[#113858]
              hover:bg-[#113858]
              hover:text-white
              sm:w-auto
            "
          >
            Explore Our Clients
          </a>

          <Link
            href="/contact"
            className="
              flex h-[46px]
              w-full max-w-[280px]
              items-center justify-center
              whitespace-nowrap
              rounded-full
              border border-[#113858]/20
              bg-white
              px-7
              text-[12px] font-semibold
              text-[#113858]
              transition-all duration-300
              hover:border-[#113858]
              hover:bg-[#113858]
              hover:text-white
              sm:w-auto
            "
          >
            Work With Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ClientsHero;
