import Link from "next/link";

const COLUMNS = [
  { title: "Shop", links: [["All products", "/products"], ["Shirts", "/products?category=Shirts"], ["Polos", "/products?category=Polos"]] },
  { title: "Customize", links: [["Design Studio", "/studio"], ["Bulk orders", "/#bulk"], ["How it works", "/#how"]] },
  { title: "Help", links: [["Shipping", "#"], ["Returns", "#"], ["Contact", "#"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-lg font-bold tracking-[0.2em]">COTTSON</div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Premium cotton essentials, customized for you and your team.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-sm font-semibold">{col.title}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} COTTSON Clothing</div>
    </footer>
  );
}
