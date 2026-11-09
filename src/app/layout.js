import { Arimo, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import { preload } from "react-dom";
import "./globals.css";
import Navbar from "../components/Navbar";
import GlassCursor from "../components/GlassCursor";

const fallback = Arimo({
  variable: "--font-display",
  subsets: ["latin"],
});

const navFont = Montserrat({
  variable: "--font-nav",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
  for (const model of ["name", "projects", "art"]) {
    preload(`/models/${model}.glb`, {
      as: "fetch",
      crossOrigin: "anonymous",
      fetchPriority: "high",
    });
  }

  return (
    <html lang="en" className={`${fallback.variable} ${navFont.variable} ${fascinate.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {/* Saved theme restored BEFORE first paint, so no light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <Navbar />
        {children}
        <GlassCursor />
      </body>
    </html>
  );
}
