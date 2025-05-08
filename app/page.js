"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isLoggedIn } from "./utils/authService";
import "./chat/chat.css";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.push("/login");
        return;
      }

      // All checks passed, redirect to dashboard
      router.push("/dashboard");
    }

    checkAuth();
  }, [router]);

  return (
    <div className="loading-container">
      <div className="loading-logo">
        <Image
          src="/logo.svg"
          alt="LiberaChain"
          width={80}
          height={80}
          priority
        />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-white page-transition">
        LiberaChain - The trully decentralized social network
      </h1>
    </div>
  );
}
