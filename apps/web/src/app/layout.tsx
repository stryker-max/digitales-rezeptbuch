import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digitales Rezeptbuch",
  description: "Deine Rezepte. Einfach gut kochen.",
  applicationName: "Digitales Rezeptbuch",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Digitales Rezeptbuch", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F172A" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
