import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/documentation", "/login", "/signup", "/privacy", "/terms"],
        disallow: ["/dashboard/", "/api/", "/oss-notices"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/documentation", "/login", "/signup", "/privacy", "/terms"],
        disallow: ["/dashboard/", "/api/", "/oss-notices"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/documentation", "/login", "/signup", "/privacy", "/terms"],
        disallow: ["/dashboard/", "/api/", "/oss-notices"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
