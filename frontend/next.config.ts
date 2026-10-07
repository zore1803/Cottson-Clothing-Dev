import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remote product photos: Cloudinary (uploads) and ImageKit (the existing library)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", port: "", pathname: "/**" },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        port: "",
        pathname: "/qiap0iq38/**",
      },
    ],
  },
  // Baseline hardening for every response. No CSP yet: the site loads third-party media and inline
  // styles, so one needs to be written against the real asset list.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Admin pages and API responses must never be cached or indexed
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/superadmin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
