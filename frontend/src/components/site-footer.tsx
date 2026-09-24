import Link from "next/link";

const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

const PAGES = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Customisation", "/studio"],
  ["Contact Us", "#contact"],
];

const SOCIAL = [
  ["WhatsApp", WHATSAPP],
  ["Instagram", "#"],
  ["Youtube", "#"],
  ["LinkedIn", "#"],
];

export function SiteFooter() {
  return (
    <footer id="contact" className="mt-24 scroll-mt-24 bg-brand text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="text-lg font-bold tracking-[0.2em]">COTTSON</div>
          <p className="mt-3 max-w-xs text-sm opacity-75">
            Custom corporate clothing for Mumbai, Thane &amp; Navi Mumbai companies. Branded T-shirts, polos and
            shirts, delivered in 7–10 days.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-60">Pages</div>
          <ul className="mt-3 space-y-2 text-sm">
            {PAGES.map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="opacity-80 hover:opacity-100">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-60">Location</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="mailto:contact@cottson.com" className="opacity-80 hover:opacity-100">
                contact@cottson.com
              </a>
            </li>
            <li className="opacity-80">
              <a href="tel:+919892297764" className="hover:opacity-100">
                +91 98922 97764
              </a>{" "}
              / 022 26627501
            </li>
            <li className="opacity-80">
              Registered Office No. 721, Centura Square IT Park, Road No. 27, Wagle Estate, Thane (W) - 400604,
              Maharashtra, India.
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-60">Contact our team</div>
          <p className="mt-3 text-sm opacity-80">Tell us about your requirement</p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-grid h-10 place-items-center rounded-full bg-background px-6 text-sm font-semibold text-brand hover:bg-background/90"
          >
            WhatsApp
          </a>
          <div className="mt-5 text-xs font-semibold uppercase tracking-wider opacity-60">Social</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {SOCIAL.map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-background/15 py-5 text-center text-xs opacity-70">
        © {new Date().getFullYear()} by Cottson Clothing. All Rights Reserved
      </div>
    </footer>
  );
}
