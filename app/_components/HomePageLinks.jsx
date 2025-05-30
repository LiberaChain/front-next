"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Auth } from "@core/auth";
import Image from "next/image";

export default function HomePageLinks() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    function checkAuth() {
      const loggedIn = Auth.isLoggedIn();
      setLoggedIn(loggedIn);
    }

    checkAuth();
  }, [router]);

  return (
    <div className="flex gap-4 flex-wrap justify-center">
      {loggedIn ? (
        <Link href={"/dashboard"}>
          <button className="px-8 py-3 rounded-xl border border-white text-white font-bold text-lg shadow-lg hover:bg-emerald-500 transition">
            <Image
              src="/logo.svg"
              width={24}
              height={24}
              className="inline mr-4 h-6 w-6"
            />
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
  );
}
