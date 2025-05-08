'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import "./chat/chat.css"
import Link from "next/link"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check all required auth items
        const liberaChainAuth = localStorage.getItem('liberaChainAuth');
        const liberaChainIdentity = localStorage.getItem('liberaChainIdentity');
        const messagingKeys = localStorage.getItem('liberaChainMessagingKeys');

        if (!liberaChainAuth || !liberaChainIdentity || !messagingKeys) {
          console.error('Missing required auth items:', {
            hasAuth: !!liberaChainAuth,
            hasIdentity: !!liberaChainIdentity,
            hasKeys: !!messagingKeys
          });
          router.push('/login');
          return;
        }

        // Check if auth has expired
        const auth = JSON.parse(liberaChainAuth);
        if (auth.expiry && auth.expiry < Date.now()) {
          console.error('Auth has expired');
          localStorage.removeItem('liberaChainAuth');
          router.push('/login');
          return;
        }

        // All checks passed, redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
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

  return null;
}
