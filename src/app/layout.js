import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${manrope.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
