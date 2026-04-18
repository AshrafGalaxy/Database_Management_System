import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus Wealth — Net Banking",
  description: "Secure, enterprise-grade internet banking powered by Nexus Wealth. Manage accounts, transfers, cards and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-inter), 'Segoe UI', system-ui, sans-serif", fontFeatureSettings: "'cv05', 'cv11', 'ss01'" }}
      >
        {children}
      </body>
    </html>
  );
}
