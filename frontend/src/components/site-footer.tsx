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
    <footer id="contact" className="mt-24 scroll-mt-24 border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-lg font-bold tracking-[0.2em] text-brand">COTTSON</div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Custom corporate clothing for Mumbai, Thane &amp; Navi Mumbai companies. Branded T-shirts, polos and
            shirts, delivered in 7–10 days.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold text-brand">Pages</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {PAGES.map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-brand">Location</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="mailto:contact@cottson.com" className="hover:text-foreground">
                contact@cottson.com
              </a>
            </li>
            <li>
              <a href="tel:+919892297764" className="hover:text-foreground">
                +91 98922 97764
              </a>{" "}
              / 022 26627501
            </li>
            <li>
              Registered Office No. 721, Centura Square IT Park, Road No. 27, Wagle Estate, Thane (W) - 400604,
              Maharashtra, India.
            </li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-brand">Social</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {SOCIAL.map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} by Cottson Clothing. All Rights Reserved
      </div>
    </footer>
  );
}
