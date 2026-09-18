import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deriv Trader — Foundation",
  description: "Deriv Trader V1 foundation shell (DEMO). No live trading.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
