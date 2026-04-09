import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MSWProvider } from "@/components/dev/MSWProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "EM · U",
  description: "Event management platform",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.jpg", type: "image/jpeg" }],
    shortcut: [{ url: "/favicon.jpg", type: "image/jpeg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#184A9A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">
        <QueryProvider>
          <MSWProvider>
            {children}
          </MSWProvider>
        </QueryProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
