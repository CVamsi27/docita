import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const iconPath = join(process.cwd(), "public/branding/Round_Logo-192.png");
  const iconBuffer = await readFile(iconPath);

  const base64Image = iconBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64Image}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <img
          src={dataUrl}
          style={{
            width: "88%",
            height: "88%",
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
