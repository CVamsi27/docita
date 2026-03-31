import { ImageResponse } from "next/og";
import { DocitaBrandMark } from "@workspace/ui/lib/docita-brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      <DocitaBrandMark width="32" height="32" />
    </div>,
    { ...size },
  );
}
