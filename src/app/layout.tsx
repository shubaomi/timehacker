import type { Metadata } from "next";
import "@fontsource-variable/azeret-mono";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Hacker — Can You Hack Time?",
  description: "A precision timing experiment with twenty hidden ways to bend the clock.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
