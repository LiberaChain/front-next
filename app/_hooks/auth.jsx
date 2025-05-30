"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@core/auth";

export function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = Auth.isLoggedIn();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, loading };
}

export function useRequireAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = Auth.isLoggedIn();
        if (!authenticated) {
          router.push("/login");
          setIsAuthenticated(false);

          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, loading };
}
