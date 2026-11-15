import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito-sans";
import "@fontsource-variable/geist";
import "./globals.css";
import { Shell } from "@/components/shell";

const description = "Learn Scripture through play. Remember it for life.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Meleko · Bible Memorization Game", template: "%s · Meleko" },
  description,
  applicationName: "Meleko",
  authors: [{ name: "San'Quan Prioleau" }],
  creator: "San'Quan Prioleau",
  appleWebApp: { capable: true, title: "Meleko", statusBarStyle: "default" },
  openGraph: { title: "Meleko", description, type: "website", siteName: "Meleko" },
  twitter: { card: "summary_large_image", title: "Meleko", description, images: ["/opengraph-image.png"] },
};

export const viewport: Viewport = {
  themeColor: "#f8faff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
