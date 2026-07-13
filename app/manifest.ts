import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Velkommen i Bussen",
    short_name: "Bussen",
    description: "Lokal transport og fællesskab i Sydlemvig.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff8ef",
    theme_color: "#f5861f",
    orientation: "portrait",
    icons: [
      {
        src: "/velkommen-i-bussen-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/velkommen-i-bussen-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/velkommen-i-bussen-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
