import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CatKeeper — Every cat counts",
  description: "Coordinate cat colonies, report sightings, and help every cat get the care it needs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
