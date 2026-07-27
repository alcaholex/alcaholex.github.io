import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import SmoothScroll from "../components/SmoothScroll";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en">
      <body className={`${montserrat.variable} ${manrope.variable} antialiased`}>
        <SmoothScroll>
          <Navbar />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
