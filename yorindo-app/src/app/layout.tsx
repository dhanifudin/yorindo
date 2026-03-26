import type { Metadata } from "next";
import "./globals.css";
import { MSWProvider } from "@/components/dev/MSWProvider";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Yorindo",
  description: "Event management platform",
  manifest: "/manifest.json",
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
        <DevToolbar />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
