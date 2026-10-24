// Single source for the public identity of the site. Everything that builds an absolute URL
// (canonical links, sitemap, robots, structured data) goes through here.

/** Public origin, no trailing slash. Set NEXT_PUBLIC_SITE_URL to the live domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cottson.com").replace(/\/$/, "");

export const SITE_NAME = "Cottson Clothing";
export const SITE_TAGLINE = "Premium Corporate Clothing & Custom Wear";
export const SITE_DESCRIPTION =
  "Custom corporate clothing from Cottson: polos, T-shirts, hoodies and uniforms in your colours with your logo. Design online, order from one piece or in bulk. Made in India.";

export const CONTACT = {
  email: "contact@cottson.com",
  phone: "+91-9892297764",
};

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
