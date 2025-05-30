import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import PageTransition from "@components/PageTransition";
// import { StateProvider } from "./_components/StateContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "LiberaChain",
    template: "%s - LiberaChain",
  },
  description: "The trully decentralized social network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* <StateProvider> */}
        <PageTransition>{children}</PageTransition>
        <Toaster position="top-right" />
        {/* </StateProvider> */}
      </body>
    </html>
  );
}
