import type { Metadata } from "next";
import "./globals.css"; // This line is what makes your CSS actually work!
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Raza ChatBot",
  description: "Connect your WhatsApp to schedule calendar events easily.",
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