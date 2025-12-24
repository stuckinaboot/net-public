import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers/Providers";

export const metadata: Metadata = {
  title: "Net Protocol Example App",
  description: "Example app demonstrating Net Protocol SDK usage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

