import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Digitales Rezeptbuch",
    short_name: "Digitales Rezeptbuch",
    description: "Deine Rezepte. Einfach gut kochen.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
