import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { PwaRegister } from "@/components/providers/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TEROR MISTIK — Personal AI Horror Writing Studio",
    template: "%s · TEROR MISTIK",
  },
  description:
    "Setiap cerita layak diabadikan. Bahkan cerita yang paling gelap sekalipun. Studio penulisan horror pribadi dengan arsip, transkripsi, dan asisten AI.",
  applicationName: "TEROR MISTIK",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TEROR MISTIK",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#101014",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain antialiased">
        <ToastProvider>{children}</ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
