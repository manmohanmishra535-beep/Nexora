import type { MetadataRoute } from "next";

// Static file routes outrank the dynamic /[username] segment, so this keeps
// crawlers from receiving an HTML profile page at /robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
