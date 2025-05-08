"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { StateProvider } from "./_components/StateContext";
// import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const inter = Inter({ subsets: ["latin"] });

// export const metadata = {
//   title: "LiberaChain",
//   description: "The trully decentralized social network",
// };

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StateProvider>
          <div key={pathname} className="page-transition">
            {children}
          </div>
          <Toaster position="top-right" />
        </StateProvider>
      </body>
    </html>
  );
}
