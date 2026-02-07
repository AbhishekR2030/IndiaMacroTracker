import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "India Macro Tracker",
  description:
    "Track Indian macroeconomic indicators - CPI, GDP, PMI, markets, and more",
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