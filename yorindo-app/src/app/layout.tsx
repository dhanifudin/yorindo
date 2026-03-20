import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MSWProvider } from "@/components/dev/MSWProvider";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Yorindo",
  description: "Event management platform",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <MSWProvider>
            {children}
          </MSWProvider>
        </QueryProvider>
        <DevToolbar />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
