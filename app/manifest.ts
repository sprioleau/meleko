import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meleko",
    short_name: "Meleko",
    description: "Learn Scripture through play. Remember it for life.",
    start_url: "/",
    display: "standalone",
    background_color: "#142442",
    theme_color: "#244fe8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
