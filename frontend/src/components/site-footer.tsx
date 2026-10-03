import Link from "next/link";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const pageLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Products", href: "/products" },
  { label: "Customisation", href: "/studio" },
  { label: "Clients", href: "/clients" },
  { label: "Resources", href: "/resources" },
  { label: "Contact Us", href: "/contact" },
];

const socialLinks = [
  { label: "WhatsApp", href: WHATSAPP },
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "LinkedIn", href: "#" },
];

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="
        bg-[#113858]
        px-3
        pb-3
        pt-3
        sm:px-5
        sm:pb-5
        sm:pt-5
        lg:px-10
        lg:pb-10
        lg:pt-10
      "
    >
      <div
        className="
          mx-auto
          max-w-[1450px]
          overflow-hidden
          rounded-[28px]
          bg-white
          sm:rounded-[32px]
          lg:rounded-[40px]
        "
      >
        {/* MAIN FOOTER GRID */}
        <div
          className="
            grid
            gap-10
            px-6
            pb-12
            pt-12
            sm:px-9
            sm:py-14
            md:grid-cols-2
            lg:grid-cols-[0.8fr_1.2fr_0.8fr_1.1fr]
            lg:gap-12
            lg:px-12
            lg:py-16
            xl:px-16
          "
        >
          {/* PAGES */}
          <div className="min-w-0">
            <h3 className="mb-5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#113858] sm:text-[14px]">
              Pages
            </h3>

            <nav className="flex flex-col items-start gap-3 sm:gap-3.5">
              {pageLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="break-words text-[14px] font-semibold text-[#113858]/75 transition-all duration-200 hover:translate-x-1 hover:text-[#113858] sm:text-[14.5px]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* CONTACT */}
          <div className="min-w-0">
            <h3 className="mb-5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#113858] sm:text-[14px]">
              Contact
            </h3>

            <div className="flex flex-col gap-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#113858]/60">
                  Email
                </p>
                <a
                  href="mailto:contact@cottson.com"
                  className="mt-1.5 inline-block break-words text-[14px] font-semibold text-[#113858] transition-colors duration-200 hover:text-[#1d5b8c] sm:text-[15px]"
                >
                  contact@cottson.com
                </a>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#113858]/60">
                  Call
                </p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <a
                    href="tel:+919892297764"
                    className="break-words text-[14px] font-semibold text-[#113858] transition-colors duration-200 hover:text-[#1d5b8c] sm:text-[15px]"
                  >
                    +91 98922 97764
                  </a>
                  <a
                    href="tel:02226627501"
                    className="break-words text-[14px] font-semibold text-[#113858] transition-colors duration-200 hover:text-[#1d5b8c] sm:text-[15px]"
                  >
                    022 26627501
                  </a>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#113858]/60">
                  Registered Office
                </p>
                <p className="mt-1.5 max-w-[320px] break-words text-[13px] font-medium leading-[1.7] text-[#607487] sm:text-[13.5px]">
                  No. 721, Centura Square IT Park, Road No. 27, Wagle Estate, Thane (W) - 400604, Maharashtra, India.
                </p>
              </div>
            </div>
          </div>

          {/* SOCIAL */}
          <div className="min-w-0">
            <h3 className="mb-5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#113858] sm:text-[14px]">
              Social
            </h3>

            <div className="flex flex-col items-start gap-3 sm:gap-3.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-[14px] font-semibold text-[#113858]/75 transition-all duration-200 hover:translate-x-1 hover:text-[#113858] sm:text-[14.5px]"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {/* BRAND */}
          <div className="min-w-0">
            <Link href="/" className="inline-block">
              <img
                src="/cottson.png"
                alt="Cottson Clothing"
                loading="lazy"
                decoding="async"
                className="h-auto w-[180px] max-w-full object-contain sm:w-[200px]"
              />
            </Link>

            <p className="mt-5 max-w-[320px] break-words text-[13px] font-medium leading-[1.75] text-[#607487] sm:text-[13.5px]">
              Premium corporate clothing & custom workwear manufactured for teams of every size across India.
            </p>
          </div>
        </div>

        {/* DIVIDER & BOTTOM BAR */}
        <div className="px-6 sm:px-9 lg:px-12 xl:px-16">
          <div className="h-px w-full bg-[#113858]/10" />

          <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-words text-[12px] font-semibold text-[#607487] sm:text-[12.5px]">
              © {new Date().getFullYear()} Cottson Clothing. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href="#"
                className="whitespace-nowrap text-[12px] font-semibold text-[#607487] transition-colors duration-200 hover:text-[#113858] sm:text-[12.5px]"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="whitespace-nowrap text-[12px] font-semibold text-[#607487] transition-colors duration-200 hover:text-[#113858] sm:text-[12.5px]"
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1450px] flex-col items-center gap-2 px-4 py-5 lg:relative lg:flex-row lg:justify-center">
        <p className="break-words text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          Custom corporate clothing for modern teams
        </p>
        <p className="text-center text-[13px] text-white lg:absolute lg:right-6 lg:text-right">
          Proudly designed by{" "}
          <a
            href="https://datacircles.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold italic underline underline-offset-2 hover:opacity-80"
          >
            DataCircles Technology
          </a>
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
