"use client";

import { Auth } from "@core/auth";
import { useIsAuthenticated } from "@hooks/auth";
import Header from "./Header";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ContentWrapper({
  children,
  title,
  className = null,
  ...props
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, _ } = useIsAuthenticated();
  const [isOnDashboard, setIsOnDashboard] = useState(false);

  const handleLogout = () => {
    Auth.clearAuthData(true);

    router.push("/");
  };

  useEffect(() => {
    // Check if the current path is the dashboard
    const checkDashboardPath = () => {
      const onDashboard = pathname.startsWith("/dashboard");
      setIsOnDashboard(onDashboard);
    };

    checkDashboardPath();
  }, [pathname]);

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-10">
      <Header title={title}>
        {isAuthenticated && !isOnDashboard && (
          <Link
            href="/dashboard"
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
          >
            Dashboard
          </Link>
        )}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
          >
            Log out
          </button>
        )}
      </Header>

      <main
        className={
          className ??
          "max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 "
        }
        {...props}
      >
        {children}
      </main>
    </div>
  );
}
