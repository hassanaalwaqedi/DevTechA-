import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HIRZEXA",
    short_name: "HIRZEXA",
    description: "Intelligence that sees the world.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FF",
    theme_color: "#0754FF",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
