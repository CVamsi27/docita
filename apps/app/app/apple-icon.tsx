import { ImageResponse } from "next/og";
import { DocitaBrandMark } from "@workspace/ui/lib/docita-brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        background: "#0f172a",
      }}
    >
      <DocitaBrandMark width="180" height="180" />
    </div>,
    { ...size },
  );
}
