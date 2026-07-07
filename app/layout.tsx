import type { Metadata } from "next";
import "./globals.css";
import { DemoStateProvider } from "@/lib/demo-state";

export const metadata: Metadata = {
  title: "Oculi",
  description: "Social discovery for photo spots in San Francisco."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoStateProvider>{children}</DemoStateProvider>
      </body>
    </html>
  );
}
