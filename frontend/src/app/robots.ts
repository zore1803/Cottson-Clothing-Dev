import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only public marketing and catalogue pages should be crawled; accounts, checkout, staff areas and the API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/superadmin", "/account", "/cart", "/checkout", "/login", "/register", "/forgot-password", "/reset-password", "/accept-invite", "/mockup-lab"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
