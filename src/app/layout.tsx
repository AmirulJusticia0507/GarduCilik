import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "GarduCilik — Simulasi Energi & Kelistrikan Rumah",
  description:
    "Game simulasi edukasi untuk belajar beban daya, inrush current, dan keselamatan kelistrikan rumah tangga.",
  applicationName: "GarduCilik",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GarduCilik",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
