import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { StateProvider } from "./_components/StateContext";
import PageTransition from "./_components/PageTransition";
// import { Inter } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const inter = Inter({ subsets: ["latin"] });

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
        <StateProvider>
          <PageTransition>{children}</PageTransition>
          <Toaster position="top-right" />
        </StateProvider>
      </body>
    </html>
  );
}
