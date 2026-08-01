import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Switchback Overland Planner",
    short_name: "Switchback",
    description:
      "Plan overland routes, ready the rig, and carry field packets offline.",
    start_url: "/plan",
    scope: "/",
    display: "standalone",
    background_color: "#15181c",
    theme_color: "#15181c",
    orientation: "any",
    categories: ["travel", "utilities"],
    icons: [
      {
        src: "/icons/switchback-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/switchback-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/switchback-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
