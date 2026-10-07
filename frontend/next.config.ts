import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/superadmin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }] }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        port: "",
        pathname: "/qiap0iq38/**",
      },
    ],
  },
};

export default nextConfig;
