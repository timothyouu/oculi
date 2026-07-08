import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { DemoStateProvider } from "@/lib/demo-state";
import { AppSettingsProvider } from "@/components/app-settings";

export const metadata: Metadata = {
  title: "Oculi",
  description: "Social discovery for photo spots across the United States and landmark destinations worldwide.",
  referrer: "origin"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settingsScript = `
    try {
      var settings = JSON.parse(localStorage.getItem("oculi:settings") || "{}");
      var themeMode = settings.themeMode === "dark" ? "dark" : "light";
      var fontSize = ["comfortable", "large", "extra-large"].indexOf(settings.fontSize) >= 0 ? settings.fontSize : "comfortable";
      document.documentElement.dataset.theme = themeMode;
      document.documentElement.dataset.fontSize = fontSize;
    } catch (error) {
      document.documentElement.dataset.theme = "light";
      document.documentElement.dataset.fontSize = "comfortable";
    }
  `;

  return (
    <html lang="en" data-theme="light" data-font-size="comfortable" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: settingsScript }} />
      </head>
      <body>
        <AppSettingsProvider>
          <DemoStateProvider>{children}</DemoStateProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
