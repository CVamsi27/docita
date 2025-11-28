import { Outfit } from "next/font/google";
import "@workspace/ui/globals.css";
import { Providers } from "./providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
  title: "Docita - Modern Clinic Management Software",
  description:
    "Streamline your clinic operations with Docita's all-in-one platform. From appointments to billing, we've got you covered.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.className} bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
