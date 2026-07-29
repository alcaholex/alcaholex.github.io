import { Arimo, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "../components/Navbar";
import SmoothScroll from "../components/SmoothScroll";
import GlassCursor from "../components/GlassCursor";

// Webfont backstop for the local-first Helvetica Neue/Arial stack in
// globals.css; Arimo is metric-compatible, so line breaks never move.
const fallback = Arimo({
  variable: "--font-display",
  subsets: ["latin"],
});

const navFont = Montserrat({
  variable: "--font-nav",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Loading-screen button only. display: "block" — the loader is the first
// paint, so hold the text invisible briefly rather than flash a fallback.
const fascinate = localFont({
  src: "../../public/fonts/Fascinate Font/Fascinate-Regular.ttf",
  variable: "--font-fascinate",
  display: "block",
});

export const metadata = {
  title: "Alex Li's Portfolio",
  description: "welcome to my portfolio!",

  icons: {
    icon: [
      { url: "/icons/icon_darkmode.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/icon_lightmode.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (

    // suppressHydrationWarning: the script below may add `dark` pre-hydration.
    <html lang="en" className={`${fallback.variable} ${navFont.variable} ${fascinate.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {/* Saved theme restored BEFORE first paint, so no light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <SmoothScroll>
          <Navbar />
          {children}
          <GlassCursor />
        </SmoothScroll>
      </body>
    </html>
  );
}
