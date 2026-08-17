import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Candidate photos are uploaded to Supabase Storage, so Next.js's
    // <Image> optimizer is allowed to fetch them.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
