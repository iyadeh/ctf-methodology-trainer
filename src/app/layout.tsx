import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { getAppSettings } from "@/modules/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CTF Methodology Trainer",
    template: "%s | CTF Methodology Trainer",
  },
  description: "Build disciplined, evidence-driven penetration-testing habits.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let initialDensity = "comfortable";
  let initialReducedMotion = false;

  try {
    const settings = await getAppSettings();
    initialDensity = settings.interface?.density || "comfortable";
    initialReducedMotion = settings.interface?.reducedMotion || false;
  } catch {
    // default fallbacks if settings cannot be read
  }

  return (
    <html
      lang="en"
      data-density={initialDensity}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased ${initialReducedMotion ? "reduced-motion" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var d = localStorage.getItem('ctf-methodology-density');
                  if (d) document.documentElement.setAttribute('data-density', d);
                  var m = localStorage.getItem('ctf-methodology-reduced-motion');
                  if (m === 'true') document.documentElement.classList.add('reduced-motion');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background text-foreground font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

