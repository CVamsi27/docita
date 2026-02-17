import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Docita",
    short_name: "Docita",
    description: "Docita clinic workspace with resilient offline shell.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "white",
    theme_color: "black",
  };
}
