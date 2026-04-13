import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { siteUrl } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.svg", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    shortcut: "/icon-192.svg",
  },
  openGraph: {
    type: "website",
    title: APP_NAME,
    description: APP_TAGLINE,
    url: siteUrl("/"),
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
