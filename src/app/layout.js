import { Arimo } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import SmoothScroll from "../components/SmoothScroll";
import GlassCursor from "../components/GlassCursor";

// The site is set in Helvetica Neue, which is licensed by Monotype and cannot
// be served as a webfont, so --font-stack in globals.css asks for the local
// copy first. This is the last rung of that stack, for machines carrying
// neither Helvetica Neue nor Arial — mainly Android and Linux. Arimo is the
// pick because it is metric-compatible with both, so it drops in at the same
// widths and the layout does not reflow. No weight list: Arimo is variable and
// covers 400-700, which spans every weight the site asks for.
const fallback = Arimo({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata = {
  title: "Alex Li's Portfolio",
  description: "welcome to my portfolio!",
  // Favicon follows the browser's colour scheme: dark ink for light UI, pale
  // ink for dark. Dark-mode file first — a browser that ignores the media
  // attribute takes the last link, and dark ink on a light tab strip is the
  // safer default.
  icons: {
    icon: [
      { url: "/icons/icon_darkmode.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/icon_lightmode.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    // The font variable goes on <html>, not <body>: globals.css builds
    // --font-stack on :root, and a var() reference resolves against the element
    // it is declared on — so --font-display has to exist by then.
    <html lang="en" className={fallback.variable}>
      <body className="antialiased">
        <SmoothScroll>
          <Navbar />
          {children}
          <GlassCursor />
        </SmoothScroll>
      </body>
    </html>
  );
}
