import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { DemoStateProvider } from "@/lib/demo-state";

export const metadata: Metadata = {
  title: "Oculi",
  description: "Social discovery for photo spots in San Francisco.",
  referrer: "origin"
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
