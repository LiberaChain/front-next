"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isLoggedIn } from "./utils/authService";
import "./chat/chat.css";

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const loggedIn = await isLoggedIn();
      setLoggedIn(loggedIn);
    }

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2FD7A2] via-[#1A223F] to-[#0F172A] flex flex-col items-center justify-start">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center mt-24 mb-16 px-4 text-center">
        <div className="flex items-center gap-4 mb-4">
          <Image
            src="/logo.svg"
            width={80}
            height={80}
            className="w-14 md:w-20"
            alt="LiberaChain Logo"
          />
          <h1 className="text-white text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
            LiberaChain
          </h1>
        </div>
        <p className="text-lg md:text-2xl text-gray-200 max-w-2xl mb-6 font-light">
          The open source, decentralized social network for the next generation.
          Own your data. Connect freely. Join the movement.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          {loggedIn ? (
            <Link href={"/dashboard"}>
              <button className="px-8 py-3 rounded-xl border border-white text-white font-bold text-lg shadow-lg hover:bg-white hover:text-[#2FD7A2] transition">
                Dashboard
              </button>
            </Link>
          ) : (
            <>
              <Link href={"/login"}>
                <button className="px-8 py-3 rounded-xl border border-white text-white font-bold text-lg shadow-lg hover:bg-white hover:text-[#2FD7A2] transition">
                  Login
                </button>
              </Link>
              <Link href={"/registration"}>
                <button className="px-8 py-3 rounded-xl border border-[#2FD7A2] text-[#2FD7A2] font-bold text-lg shadow-lg hover:bg-[#2FD7A2] hover:text-[#0F172A] transition">
                  Create Account
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-4 mb-20">
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          {/* Decentralized SVG */}
          <svg
            className="text-[#2FD7A2] mb-3"
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" stroke="#2FD7A2" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="#2FD7A2" />
            <circle cx="4" cy="12" r="1.5" fill="#2FD7A2" />
            <circle cx="20" cy="12" r="1.5" fill="#2FD7A2" />
            <circle cx="12" cy="4" r="1.5" fill="#2FD7A2" />
            <circle cx="12" cy="20" r="1.5" fill="#2FD7A2" />
          </svg>
          <h2 className="text-white text-2xl font-semibold mb-2">
            Decentralized
          </h2>
          <p className="text-gray-300">
            No central authority. Your posts and data are stored on the
            blockchain and IPFS, ensuring true ownership and censorship
            resistance.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          {/* Privacy SVG */}
          <svg
            className="text-[#2FD7A2] mb-3"
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 24 24"
          >
            <rect
              x="4"
              y="8"
              width="16"
              height="10"
              rx="2"
              stroke="#2FD7A2"
              strokeWidth="2"
            />
            <path d="M8 8V6a4 4 0 1 1 8 0v2" stroke="#2FD7A2" strokeWidth="2" />
          </svg>
          <h2 className="text-white text-2xl font-semibold mb-2">
            Privacy First
          </h2>
          <p className="text-gray-300">
            Your identity and data are protected with cryptography. Share what
            you want, when you want, with full control.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          {/* GitHub SVG */}
          <svg
            className="text-[#2FD7A2] mb-3"
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 2C6.48 2 2 6.58 2 12.26c0 4.48 2.87 8.28 6.84 9.63.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
              fill="#2FD7A2"
            />
          </svg>
          <h2 className="text-white text-2xl font-semibold mb-2">
            Open Source
          </h2>
          <p className="text-gray-300">
            Transparent and community-driven. Contribute on{" "}
            <a
              href="https://github.com/LiberaChain"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#2FD7A2]"
            >
              GitHub
            </a>{" "}
            and help shape the future of social networking.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          {/* Community SVG */}
          <svg
            className="text-[#2FD7A2] mb-3"
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="7" r="3" stroke="#2FD7A2" strokeWidth="2" />
            <path
              d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"
              stroke="#2FD7A2"
              strokeWidth="2"
            />
          </svg>
          <h2 className="text-white text-2xl font-semibold mb-2">
            Community Powered
          </h2>
          <p className="text-gray-300">
            Join a global community of innovators, creators, and free thinkers.
            LiberaChain is built for and by its users.
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="w-full max-w-3xl px-4 mb-16 text-center">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
          What is LiberaChain?
        </h3>
        <p className="text-gray-300 mb-4">
          LiberaChain is a decentralized, blockchain-based social network that
          empowers users to connect, share, and interact without intermediaries.
          Our mission is to return control of social media to the people,
          ensuring privacy, transparency, and freedom of expression for all.
        </p>
        <a
          href="https://github.com/LiberaChain"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-[#2FD7A2] text-[#0F172A] font-semibold shadow hover:bg-white hover:text-[#2FD7A2] transition"
        >
          {/* GitHub SVG */}
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 2C6.48 2 2 6.58 2 12.26c0 4.48 2.87 8.28 6.84 9.63.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
              fill="#0F172A"
            />
          </svg>
          View on GitHub
        </a>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-500 text-sm border-t border-[#2FD7A2]/10">
        © {new Date().getFullYear()} LiberaChain. Open Source. Decentralized.
        Yours.
      </footer>
    </div>
  );
}
